import { expect } from "chai";
import { ethers } from "hardhat";
import { TipJar, TipJar__factory } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TipJar", () => {
  let tipJar: TipJar;
  let owner: HardhatEthersSigner;
  let tipper: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, tipper, other] = await ethers.getSigners();
    tipJar = await new TipJar__factory(owner).deploy();
  });

  it("accepts a tip and emits NewTip with correct payload", async () => {
    const amount = ethers.parseEther("0.01");
    const message = "Great work!";

    await expect(tipJar.connect(tipper).tip(message, { value: amount }))
      .to.emit(tipJar, "NewTip")
      .withArgs(tipper.address, amount, message);

    expect(await ethers.provider.getBalance(await tipJar.getAddress())).to.equal(amount);
  });

  it("allows owner to withdraw accumulated balance", async () => {
    const amount = ethers.parseEther("0.05");
    await tipJar.connect(tipper).tip("tip1", { value: amount });

    const ownerBefore = await ethers.provider.getBalance(owner.address);
    const tx = await tipJar.connect(owner).withdraw();
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;

    const ownerAfter = await ethers.provider.getBalance(owner.address);
    expect(ownerAfter).to.equal(ownerBefore + amount - gasCost);
    expect(await ethers.provider.getBalance(await tipJar.getAddress())).to.equal(0n);
  });

  it("reverts when non-owner calls withdraw", async () => {
    await tipJar.connect(tipper).tip("tip", { value: ethers.parseEther("0.01") });
    await expect(tipJar.connect(other).withdraw()).to.be.revertedWithCustomError(tipJar, "NotOwner");
  });

  it("reverts tip with zero value", async () => {
    await expect(tipJar.connect(tipper).tip("empty", { value: 0 })).to.be.revertedWithCustomError(
      tipJar,
      "NoValue"
    );
  });

  describe("tipWithSig (EIP-712 gasless)", () => {
    const tipDomain = async () => ({
      name: "TipJar",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await tipJar.getAddress(),
    });

    const tipTypes = {
      Tip: [
        { name: "from", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "message", type: "string" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    async function signTip(
      signer: HardhatEthersSigner,
      amount: bigint,
      message: string,
      deadline: number
    ) {
      const nonce = await tipJar.nonces(signer.address);
      const domain = await tipDomain();
      return signer.signTypedData(domain, tipTypes, {
        from: signer.address,
        amount,
        message,
        nonce,
        deadline,
      });
    }

    it("accepts a relayed signed tip and emits NewTip", async () => {
      const amount = ethers.parseEther("0.02");
      const message = "Gasless thanks!";
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const signature = await signTip(tipper, amount, message, deadline);

      await expect(
        tipJar.connect(other).tipWithSig(tipper.address, amount, message, deadline, signature, {
          value: amount,
        })
      )
        .to.emit(tipJar, "NewTip")
        .withArgs(tipper.address, amount, message);

      expect(await tipJar.nonces(tipper.address)).to.equal(1n);
    });

    it("reverts expired signatures", async () => {
      const amount = ethers.parseEther("0.01");
      const deadline = Math.floor(Date.now() / 1000) - 60;
      const signature = await signTip(tipper, amount, "late", deadline);

      await expect(
        tipJar.connect(other).tipWithSig(tipper.address, amount, "late", deadline, signature, {
          value: amount,
        })
      ).to.be.revertedWithCustomError(tipJar, "Expired");
    });

    it("reverts invalid signatures", async () => {
      const amount = ethers.parseEther("0.01");
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const signature = await signTip(tipper, amount, "bad sig", deadline);

      await expect(
        tipJar.connect(other).tipWithSig(other.address, amount, "bad sig", deadline, signature, {
          value: amount,
        })
      ).to.be.revertedWithCustomError(tipJar, "InvalidSignature");
    });

    it("reverts when msg.value does not match amount", async () => {
      const amount = ethers.parseEther("0.01");
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const signature = await signTip(tipper, amount, "wrong value", deadline);

      await expect(
        tipJar
          .connect(other)
          .tipWithSig(tipper.address, amount, "wrong value", deadline, signature, {
            value: ethers.parseEther("0.005"),
          })
      ).to.be.revertedWithCustomError(tipJar, "InvalidValue");
    });
  });
});
