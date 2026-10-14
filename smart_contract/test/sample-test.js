const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Transactions", function () {
  let transactions;
  let sender;
  let receiver;

  beforeEach(async function () {
    [sender, receiver] = await ethers.getSigners();
    const Transactions = await ethers.getContractFactory("Transactions");
    transactions = await Transactions.deploy();
    await transactions.deployed();
  });

  it("transfers the exact payment and records the transaction", async function () {
    const amount = ethers.utils.parseEther("0.25");
    const receiverBalanceBefore = await receiver.getBalance();

    const tx = await transactions
      .connect(sender)
      .addToBlockchain(receiver.address, amount, "Thanks", "travel", {
        value: amount,
      });
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);

    await expect(tx)
      .to.emit(transactions, "Transfer")
      .withArgs(
        sender.address,
        receiver.address,
        amount,
        "Thanks",
        block.timestamp,
        "travel",
      );

    expect((await receiver.getBalance()).sub(receiverBalanceBefore)).to.equal(amount);
    expect(await transactions.getTransactionCount()).to.equal(1);

    const [record] = await transactions.getAllTransactions();
    expect(record.sender).to.equal(sender.address);
    expect(record.receiver).to.equal(receiver.address);
    expect(record.amount).to.equal(amount);
    expect(record.message).to.equal("Thanks");
    expect(record.keyword).to.equal("travel");
  });

  it("rejects a payment that does not match the recorded amount", async function () {
    const amount = ethers.utils.parseEther("0.25");

    await expect(
      transactions
        .connect(sender)
        .addToBlockchain(receiver.address, amount, "", "", {
          value: ethers.utils.parseEther("0.1"),
        }),
    ).to.be.revertedWith("Payment must match amount");
  });

  it("rejects the zero address as a receiver", async function () {
    await expect(
      transactions
        .connect(sender)
        .addToBlockchain(ethers.constants.AddressZero, 0, "", "", { value: 0 }),
    ).to.be.revertedWith("Invalid receiver");
  });
});
