import { expect } from 'chai';
import hre, { ethers } from 'hardhat';

describe('FavoriteMovie', () => {
  const deployContractFixture = async () => {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const Contract = await ethers.getContractFactory('FavoriteMovie');
    const contract = await Contract.deploy();

    return { contract, owner, user1, user2, user3 };
  };

  describe('Deployment', () => {
    it('Should set the correct initial owner', async () => {
      const { contract, owner } = await deployContractFixture();

      expect(await contract.contractOwner()).to.equal(await owner.getAddress());
    });

    it('Should set the correct initial pause status', async () => {
      const { contract, owner } = await deployContractFixture();

      expect(await contract.contractPaused()).to.be.false;
    });
  });

  describe('Owner Functions', () => {
    describe('Transfer ownership', () => {
      it('Should update the contract owner to a new owner', async () => {
        const { contract, user1 } = await deployContractFixture();

        const newUser = await user1.getAddress();

        await contract.transferOwnership(newUser);

        expect(await contract.contractOwner()).to.equal(newUser);
      });

      it('Should revert if new owner is on the blacklist', async () => {
        const { contract, user1 } = await deployContractFixture();

        const newUser = await user1.getAddress();

        await contract.banUser(newUser);

        await expect(contract.transferOwnership(newUser)).to.be.revertedWith(
          'Blacklisted user accounts cannot take ownership'
        );
      });

      it('Should revert if the caller is not the owner', async () => {
        const { contract, user1 } = await deployContractFixture();

        await expect(
          contract.connect(user1).transferOwnership(await user1.getAddress())
        ).to.be.revertedWith('Only the owner can modify this contract');
      });

      // it('Should revert if the caller is locked', async () => {});

      it('Should revert if the contract is paused', async () => {
        const { contract, user1 } = await deployContractFixture();

        await contract.pauseContract();

        await expect(
          contract.transferOwnership(await user1.getAddress())
        ).to.be.revertedWith('Contract is paused');
      });
    });

    describe('Suspend contract', () => {
      describe('Pause contract', () => {
        it('Should set pause status to true', async () => {
          const { contract } = await deployContractFixture();

          await contract.pauseContract();

          expect(await contract.contractPaused()).to.be.true;
        });

        it('Should revert if pause status is already true', async () => {
          const { contract } = await deployContractFixture();

          await contract.pauseContract();

          await expect(contract.pauseContract()).to.be.revertedWith(
            'Contract has already been paused'
          );
        });

        it('Should revert if the caller is not the owner', async () => {
          const { contract, user1 } = await deployContractFixture();

          await expect(
            contract.connect(user1).pauseContract()
          ).to.be.revertedWith('Only the owner can modify this contract');
        });

        // it('Should revert if the caller is locked', async () => {});
      });

      describe('Unpause contract', () => {
        it('Should set pause status to false', async () => {
          const { contract } = await deployContractFixture();

          await contract.pauseContract();

          expect(await contract.contractPaused()).to.be.true;

          await contract.unpauseContract();

          expect(await contract.contractPaused()).to.be.false;
        });

        it('Should revert if pause status is already false', async () => {
          const { contract } = await deployContractFixture();

          await contract.pauseContract();

          expect(await contract.contractPaused()).to.be.true;

          await contract.unpauseContract();

          expect(await contract.contractPaused()).to.be.false;

          await expect(contract.unpauseContract()).to.be.revertedWith(
            'Contract has already been unpaused'
          );
        });

        it('Should revert if the caller is not the owner', async () => {
          const { contract, user1 } = await deployContractFixture();

          await expect(
            contract.connect(user1).unpauseContract()
          ).to.be.revertedWith('Only the owner can modify this contract');
        });

        // it('Should revert if the caller is locked', async () => {});
      });
    });

    describe('Blacklist users', () => {
      describe('Block user account', () => {});

      describe('Unblock user account', () => {});
    });
  });
});
