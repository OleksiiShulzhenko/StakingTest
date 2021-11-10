const Ganache = require("./helpers/ganache");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakingContract", () => {
    const ganache = new Ganache();

    let accounts;
    let owner;
    let user;
    let userTwo;

    let stakingRewards;

    let token;
    let token2;

    before("setup", async () => {
        accounts = await ethers.getSigners();
        owner = accounts[0];
        user = accounts[1];
        userTwo = accounts[3];

        const Token = await ethers.getContractFactory("Token");

        token = await Token.deploy();
        await token.deployed();
        await token.mint(user.address, 100000);
        await token.mint(userTwo.address, 100000);

        token2 = await Token.deploy();
        await token2.deployed();

        const StakingRewards = await ethers.getContractFactory(
            "StakingContract"
        );
        stakingRewards = await StakingRewards.deploy(
            owner.address,
            token2.address,
            token.address
        );
        await stakingRewards.deployed();
        await token2.mint(stakingRewards.address, 1000000);

        await ganache.stopMine();
        await ganache.setTime(1e10);
        await ganache.mine();

        await stakingRewards.setRewardsDuration(86400);
        await stakingRewards.notifyRewardAmount(86400);

        await ganache.mine();
        await ganache.startMine();
        await ganache.snapshot();
    });

    afterEach("cleanup", async () => {
        await ganache.revert();
        await ganache.startMine();
    });

    //positive tests

    it("should stake", async () => {
        await token.connect(user).approve(stakingRewards.address, 10);
        await stakingRewards.connect(user).stake(10);

        const supply = await stakingRewards.balanceOf(user.address);

        expect(supply).to.equal(10);
    });

    it("should exit", async () => {
        await token.connect(user).approve(stakingRewards.address, 10);
        await stakingRewards.connect(user).stake(10);
        await stakingRewards.connect(user).exit();

        const token1ballance = await token.balanceOf(user.address);
        const token2ballance = await token2.balanceOf(user.address);

        expect(token1ballance).to.equal(100000);
    });

    it("should exit and be rewarded with reward token", async () => {
        await token.connect(user).approve(stakingRewards.address, 100);
        await stakingRewards.connect(user).stake(100);

        await ganache.increaseTime(86400);
        await ganache.mine();

        await stakingRewards.connect(user).exit();

        const token1ballance = await token.balanceOf(user.address);
        const token2ballance = await token2.balanceOf(user.address);

        expect(token1ballance).to.equal(100000);
        expect(token2ballance).to.be.least(86300).and.to.be.most(86500);
    });

    it("should withdraw", async () => {
        await token.connect(user).approve(stakingRewards.address, 100);
        await stakingRewards.connect(user).stake(100);

        await ganache.increaseTime(86400);
        await ganache.mine();

        await stakingRewards.connect(user).withdraw(100);

        const token1ballance = await token.balanceOf(user.address);
        const token2ballance = await token2.balanceOf(user.address);

        expect(token1ballance).to.equal(100000);
        expect(token2ballance).to.equal(0);
    });

    it("should getReward with both reward tokens", async () => {
        await token.connect(user).approve(stakingRewards.address, 100);
        await stakingRewards.connect(user).stake(100);

        await ganache.increaseTime(86400);
        await ganache.mine();

        await stakingRewards.connect(user).getReward();

        const token1ballance = await token.balanceOf(user.address);
        const token2ballance = await token2.balanceOf(user.address);

        expect(token1ballance).to.equal(99900);
        expect(token2ballance).to.be.least(86300).and.to.be.most(86500);
    });

    it("should get reward multiple times", async () => {
        await token.connect(user).approve(stakingRewards.address, 100);
        await stakingRewards.connect(user).stake(100);

        await ganache.increaseTime(21600);
        await ganache.mine();

        await stakingRewards.connect(user).getReward();

        await ganache.increaseTime(21600);
        await ganache.mine();

        await stakingRewards.connect(user).getReward();

        await ganache.increaseTime(21600);
        await ganache.mine();

        await stakingRewards.connect(user).getReward();

        await ganache.increaseTime(21600);
        await ganache.mine();

        await stakingRewards.connect(user).getReward();

        const token1ballance = await token.balanceOf(user.address);
        const token2ballance = await token2.balanceOf(user.address);

        expect(token1ballance).to.equal(99900);
        expect(token2ballance).to.be.least(86300).and.to.be.most(86500);
    });

    it("should stake multiple times by 1 user", async () => {
        await token.connect(user).approve(stakingRewards.address, 10);
        await stakingRewards.connect(user).stake(10);

        await ganache.increaseTime(28800);
        await ganache.mine();

        await token.connect(user).approve(stakingRewards.address, 10);
        await stakingRewards.connect(user).stake(10);

        await ganache.increaseTime(28800);
        await ganache.mine();

        await token.connect(user).approve(stakingRewards.address, 10);
        await stakingRewards.connect(user).stake(10);

        await ganache.increaseTime(28800);
        await ganache.mine();

        await stakingRewards.connect(user).exit();

        const token1ballance = await token.balanceOf(user.address);
        const token2ballance = await token2.balanceOf(user.address);

        expect(token1ballance).to.equal(100000);
        expect(token2ballance).to.be.least(86300).and.to.be.most(86500);
    });

    it("should stake & exit multiple times by 1 user", async () => {
        await token.connect(user).approve(stakingRewards.address, 10);
        await stakingRewards.connect(user).stake(10);

        await ganache.increaseTime(21600);
        await ganache.mine();

        await stakingRewards.connect(user).exit();

        await ganache.increaseTime(43200);
        await ganache.mine();

        await token.connect(user).approve(stakingRewards.address, 10);
        await stakingRewards.connect(user).stake(10);

        await ganache.increaseTime(21600);
        await ganache.mine();

        await stakingRewards.connect(user).exit();

        await ganache.increaseTime(28800);
        await ganache.mine();

        const token1ballance = await token.balanceOf(user.address);
        const token2ballance = await token2.balanceOf(user.address);

        expect(token1ballance).to.equal(100000);
        expect(token2ballance).to.be.least(43100).and.to.be.most(43300);
    });

    it("should reward 2 users with the same stake", async () => {
        await token.connect(user).approve(stakingRewards.address, 100);
        await stakingRewards.connect(user).stake(100);

        await token.connect(userTwo).approve(stakingRewards.address, 100);
        await stakingRewards.connect(userTwo).stake(100);

        await ganache.increaseTime(86400);
        await ganache.mine();

        await stakingRewards.connect(user).exit();
        const user1token1ballance = await token.balanceOf(user.address);
        const user1token2ballance = await token2.balanceOf(user.address);

        await stakingRewards.connect(userTwo).exit();
        const user2token1ballance = await token.balanceOf(userTwo.address);
        const user2token2ballance = await token2.balanceOf(userTwo.address);

        expect(user1token1ballance).to.equal(100000);
        expect(user1token2ballance).to.be.least(43100).and.to.be.most(43300);

        expect(user2token1ballance).to.equal(100000);
        expect(user2token2ballance).to.be.least(43100).and.to.be.most(43300);
    });

    it("should reward 2 users with different stakes", async () => {
        await token.connect(user).approve(stakingRewards.address, 100);
        await stakingRewards.connect(user).stake(100);

        await token.connect(userTwo).approve(stakingRewards.address, 10);
        await stakingRewards.connect(userTwo).stake(10);

        await ganache.increaseTime(86400);
        await ganache.mine();

        await stakingRewards.connect(user).exit();
        const user1token1ballance = await token.balanceOf(user.address);
        const user1token2ballance = await token2.balanceOf(user.address);

        await stakingRewards.connect(userTwo).exit();
        const user2token1ballance = await token.balanceOf(userTwo.address);
        const user2token2ballance = await token2.balanceOf(userTwo.address);

        expect(user1token1ballance).to.equal(100000);
        expect(user1token2ballance).to.be.least(78400).and.to.be.most(78600);

        expect(user2token1ballance).to.equal(100000);
        expect(user2token2ballance).to.be.least(7840).and.to.be.most(7860);
    });

    it("should reward 2 users with different duration", async () => {
        await token.connect(user).approve(stakingRewards.address, 100);
        await stakingRewards.connect(user).stake(100);

        await token.connect(userTwo).approve(stakingRewards.address, 100);
        await stakingRewards.connect(userTwo).stake(100);

        await ganache.increaseTime(43200);
        await ganache.mine();

        await stakingRewards.connect(user).exit();
        const user1token1ballance = await token.balanceOf(user.address);
        const user1token2ballance = await token2.balanceOf(user.address);

        await ganache.increaseTime(43200);
        await ganache.mine();

        await stakingRewards.connect(userTwo).exit();
        const user2token1ballance = await token.balanceOf(userTwo.address);
        const user2token2ballance = await token2.balanceOf(userTwo.address);

        expect(user1token1ballance).to.equal(100000);
        expect(user1token2ballance).to.be.least(21500).and.to.be.most(21700);

        expect(user2token1ballance).to.equal(100000);
        expect(user2token2ballance).to.be.least(64700).and.to.be.most(64900);
    });

    it("should reward 2 users with different duration & stake", async () => {
        await token.connect(user).approve(stakingRewards.address, 100);
        await stakingRewards.connect(user).stake(100);

        await token.connect(userTwo).approve(stakingRewards.address, 100);
        await stakingRewards.connect(userTwo).stake(100);

        await ganache.increaseTime(43200);
        await ganache.mine();

        await stakingRewards.connect(user).withdraw(50);

        await ganache.increaseTime(43200);
        await ganache.mine();

        await stakingRewards.connect(user).exit();
        const user1token1ballance = await token.balanceOf(user.address);
        const user1token2ballance = await token2.balanceOf(user.address);

        await stakingRewards.connect(userTwo).exit();
        const user2token1ballance = await token.balanceOf(userTwo.address);
        const user2token2ballance = await token2.balanceOf(userTwo.address);

        expect(user1token1ballance).to.equal(100000);
        expect(user1token2ballance).to.be.least(35900).and.to.be.most(36100);

        expect(user2token1ballance).to.equal(100000);
        expect(user2token2ballance).to.be.least(50300).and.to.be.most(50500);
    });

    it("should withdraw half of the stake and then exit", async () => {
        await token.connect(user).approve(stakingRewards.address, 100);
        await stakingRewards.connect(user).stake(100);

        await token.connect(userTwo).approve(stakingRewards.address, 100);
        await stakingRewards.connect(userTwo).stake(100);

        await ganache.increaseTime(43200);
        await ganache.mine();

        await stakingRewards.connect(user).withdraw(50);

        await ganache.increaseTime(43200);
        await ganache.mine();

        await stakingRewards.connect(user).exit();
        const user1token1ballance = await token.balanceOf(user.address);
        const user1token2ballance = await token2.balanceOf(user.address);

        await stakingRewards.connect(userTwo).exit();
        const user2token1ballance = await token.balanceOf(userTwo.address);
        const user2token2ballance = await token2.balanceOf(userTwo.address);

        expect(user1token1ballance).to.equal(100000);
        expect(user1token2ballance).to.be.least(35900).and.to.be.most(36100);

        expect(user2token1ballance).to.equal(100000);
        expect(user2token2ballance).to.be.least(50300).and.to.be.most(50500);
    });

    it("should reward correctly with different allocation", async () => {
        await stakingRewards.updatePeriodFinish(
            JSON.parse(JSON.stringify(await ethers.provider.getBlock()))
                .timestamp
        );
        await stakingRewards.setRewardsDuration(86400);
        await stakingRewards.notifyRewardAmount(172800);

        await token.connect(user).approve(stakingRewards.address, 100);
        await stakingRewards.connect(user).stake(100);

        await token.connect(userTwo).approve(stakingRewards.address, 100);
        await stakingRewards.connect(userTwo).stake(100);

        await ganache.increaseTime(43200);
        await ganache.mine();

        await stakingRewards.connect(user).exit();
        const user1token1ballance = await token.balanceOf(user.address);
        const user1token2ballance = await token2.balanceOf(user.address);

        await stakingRewards.connect(userTwo).exit();
        const user2token1ballance = await token.balanceOf(userTwo.address);
        const user2token2ballance = await token2.balanceOf(userTwo.address);

        expect(user1token1ballance).to.equal(100000);
        expect(user1token2ballance).to.be.least(43100).and.to.be.most(43300);

        expect(user2token1ballance).to.equal(100000);
        expect(user2token2ballance).to.be.least(43100).and.to.be.most(43300);
    });

    it("should emit RewardPaid event", async () => {
        await token.connect(user).approve(stakingRewards.address, 100);
        await stakingRewards.connect(user).stake(100);

        await ganache.increaseTime(86400);
        await ganache.mine();

        const earned = await stakingRewards.earned(user.address);

        await expect(stakingRewards.connect(user).getReward())
            .to.emit(stakingRewards, "RewardPaid")
            .withArgs(user.address, earned);
    });

    //negative tests

    it("should not allow to stake more than balance", async () => {
        await token.connect(user).approve(stakingRewards.address, 1000001);

        await expect(
          stakingRewards.connect(user).stake(1000001)
        ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("should not allow to withdraw more than balance", async () => {
        await token.connect(user).approve(stakingRewards.address, 100);
        await stakingRewards.connect(user).stake(100);

        await ganache.increaseTime(43200);
        await ganache.mine();

        await expect(stakingRewards.connect(user).withdraw(10000)).to.be
            .reverted;
    });

    it("should not allow to withdraw more than staked", async () => {
        await token.connect(user).approve(stakingRewards.address, 100);
        await stakingRewards.connect(user).stake(100);
        await token.connect(userTwo).approve(stakingRewards.address, 100);
        await stakingRewards.connect(userTwo).stake(100);

        await ganache.increaseTime(43200);
        await ganache.mine();

        await expect(stakingRewards.connect(user).withdraw(101)).to.be
            .reverted;
    });
});
