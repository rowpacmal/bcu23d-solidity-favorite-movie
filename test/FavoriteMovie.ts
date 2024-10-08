import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('FavoriteMovie', () => {
  const deployContractFixture = async () => {
    enum VotingState {
      NotStarted,
      Ongoing,
      Finished,
    }

    const { NotStarted, Ongoing, Finished } = VotingState;
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const Contract = await ethers.getContractFactory('FavoriteMovie');
    const contract = await Contract.deploy();

    return {
      contract,
      owner,
      NotStarted,
      Ongoing,
      Finished,
      user1,
      user2,
      user3,
    };
  };

  describe('Deployment', () => {
    it('Should set the correct initial owner', async () => {
      const { contract, owner } = await deployContractFixture();

      expect(await contract.contractOwner()).to.equal(await owner.getAddress());
    });

    it('Should set the correct initial pause status', async () => {
      const { contract } = await deployContractFixture();

      expect(await contract.contractPaused()).to.be.false;
    });
  });

  describe('Owner Functions', () => {
    describe('Transfer ownership', () => {
      it('Should update the contract owner to a new owner', async () => {
        const { contract, user1 } = await deployContractFixture();
        const userAccount = await user1.getAddress();

        await contract.transferOwnership(userAccount);

        expect(await contract.contractOwner()).to.equal(userAccount);
      });

      it('Should revert if new owner is on the blacklist', async () => {
        const { contract, user1 } = await deployContractFixture();
        const userAccount = await user1.getAddress();

        await contract.blockUser(userAccount);

        await expect(
          contract.transferOwnership(userAccount)
        ).to.be.revertedWith('Blacklisted user accounts cannot take ownership');
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
      describe('Block user account', () => {
        it('Should add an user account to the blacklist', async () => {
          const { contract, user1 } = await deployContractFixture();
          const userAccount = await user1.getAddress();

          await contract.blockUser(userAccount);

          expect(await contract.blacklist(userAccount)).to.be.true;
        });

        it('Should revert if the caller is not the owner', async () => {
          const { contract, user1, user2 } = await deployContractFixture();

          await expect(
            contract.connect(user1).blockUser(await user2.getAddress())
          ).to.be.revertedWith('Only the owner can modify this contract');
        });

        it('Should revert when trying to modify the owners status', async () => {
          const { contract, owner } = await deployContractFixture();

          await expect(
            contract.blockUser(await owner.getAddress())
          ).to.be.revertedWith('Owner status cannot be modified');
        });

        // it('Should revert if the caller is locked', async () => {});

        it('Should revert if the contract is paused', async () => {
          const { contract, user1 } = await deployContractFixture();

          await contract.pauseContract();

          await expect(
            contract.blockUser(await user1.getAddress())
          ).to.be.revertedWith('Contract is paused');
        });
      });

      describe('Unblock user account', () => {
        it('Should remove an user account from the blacklist', async () => {
          const { contract, user1 } = await deployContractFixture();
          const userAccount = await user1.getAddress();

          await contract.blockUser(userAccount);

          expect(await contract.blacklist(userAccount)).to.be.true;

          await contract.unblockUser(userAccount);

          expect(await contract.blacklist(userAccount)).to.be.false;
        });

        it('Should revert if the caller is not the owner', async () => {
          const { contract, user1, user2 } = await deployContractFixture();
          const userAccount = await user1.getAddress();

          await contract.blockUser(userAccount);

          expect(await contract.blacklist(userAccount)).to.be.true;

          await expect(
            contract.connect(user2).unblockUser(await user1.getAddress())
          ).to.be.revertedWith('Only the owner can modify this contract');
        });

        it('Should revert when trying to modify the owners status', async () => {
          const { contract, owner } = await deployContractFixture();

          await expect(
            contract.unblockUser(await owner.getAddress())
          ).to.be.revertedWith('Owner status cannot be modified');
        });

        // it('Should revert if the caller is locked', async () => {});

        it('Should revert if the contract is paused', async () => {
          const { contract, user1 } = await deployContractFixture();
          const userAccount = await user1.getAddress();

          await contract.blockUser(userAccount);

          expect(await contract.blacklist(userAccount)).to.be.true;

          await contract.pauseContract();

          await expect(contract.unblockUser(userAccount)).to.be.revertedWith(
            'Contract is paused'
          );
        });
      });
    });
  });

  describe('User Functions', () => {
    describe('Voting Poll', () => {
      describe('Add a voting poll', () => {
        it('Should add a new voting poll with correct values', async () => {
          const { contract, NotStarted, user1 } = await deployContractFixture();
          const userAccount = await user1.getAddress();
          const durationInHours = 2 * 3600;
          const index = 1;
          const winningMovie = '';
          const exists = true;
          const isTie = false;
          const favoriteMovies: [string, string, string] = [
            'movie1',
            'movie2',
            'movie3',
          ];

          const functionCall = await contract
            .connect(user1)
            .addVotingPoll(favoriteMovies, durationInHours);
          const expectedCall = await functionCall.wait();
          const block = await ethers.provider.getBlock(
            expectedCall?.blockNumber || 0
          );
          const blockTimestamp = block?.timestamp;
          const newVotingPoll = await contract.votingPolls(userAccount, 1);
          const votingPollMovies = await contract.getMoviesFromVotingPoll(
            userAccount,
            1
          );

          expect(newVotingPoll.owner).to.equal(userAccount);
          expect(newVotingPoll.votingIndex).to.equal(index);
          expect(
            Number(newVotingPoll.votingDeadline) - durationInHours
          ).to.equal(blockTimestamp);
          expect(newVotingPoll.winningMovie).to.equal(winningMovie);
          expect(newVotingPoll.exists).to.equal(exists);
          expect(newVotingPoll.isTie).to.equal(isTie);
          expect(newVotingPoll.votingState).to.equal(NotStarted);
          expect(JSON.stringify(votingPollMovies[0])).to.equal(
            JSON.stringify(favoriteMovies)
          );
        });

        it('Should increase the voting index by 1', async () => {
          const { contract, user1 } = await deployContractFixture();

          expect(await contract.votingIndex()).to.equal(0);

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600);

          expect(await contract.votingIndex()).to.equal(1);

          await contract
            .connect(user1)
            .addVotingPoll(['movieA', 'movieB', 'movieC'], 2 * 3600);

          expect(await contract.votingIndex()).to.equal(2);
        });

        it('Should revert if the caller is blacklisted', async () => {
          const { contract, user1 } = await deployContractFixture();

          await contract.blockUser(user1.getAddress());

          await expect(
            contract
              .connect(user1)
              .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600)
          ).to.be.revertedWith('Blacklisted user account, access denied');
        });

        // it('Should revert if the caller is locked', async () => {});

        it('Should revert if the contract is paused', async () => {
          const { contract, user1 } = await deployContractFixture();

          await contract.pauseContract();

          await expect(
            contract
              .connect(user1)
              .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600)
          ).to.be.revertedWith('Contract is paused');
        });
      });

      describe('Start a voting Poll', () => {
        it('Should update a voting polls state from NotStarted to Ongoing', async () => {
          const { contract, NotStarted, Ongoing, user1 } =
            await deployContractFixture();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600);

          expect(
            (await contract.votingPolls(user1.getAddress(), 1)).votingState
          ).to.equal(NotStarted);

          await contract.connect(user1).startVotingPoll(1);

          expect(
            (await contract.votingPolls(user1.getAddress(), 1)).votingState
          ).to.equal(Ongoing);
        });

        it('Should revert if the caller is blacklisted', async () => {
          const { contract, user1 } = await deployContractFixture();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600);

          await contract.blockUser(user1.getAddress());

          await expect(
            contract.connect(user1).startVotingPoll(1)
          ).to.be.revertedWith('Blacklisted user account, access denied');
        });

        // it('Should revert if the caller is locked', async () => {});

        it('Should revert if the contract is paused', async () => {
          const { contract, user1 } = await deployContractFixture();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600);

          await contract.pauseContract();

          await expect(
            contract.connect(user1).startVotingPoll(1)
          ).to.be.revertedWith('Contract is paused');
        });

        it('Should revert if the voting poll does not exists', async () => {
          const { contract, user1 } = await deployContractFixture();

          await expect(
            contract.connect(user1).startVotingPoll(1)
          ).to.be.revertedWith('Voting poll not found');
        });

        it('Should revert if not in the correct voting state', async () => {
          const { contract, NotStarted, Ongoing, user1 } =
            await deployContractFixture();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600);

          expect(
            (await contract.votingPolls(user1.getAddress(), 1)).votingState
          ).to.equal(NotStarted);

          await contract.connect(user1).startVotingPoll(1);

          expect(
            (await contract.votingPolls(user1.getAddress(), 1)).votingState
          ).to.equal(Ongoing);

          await expect(contract.connect(user1).startVotingPoll(1))
            .to.be.revertedWithCustomError(contract, 'CustomError_InvalidState')
            .withArgs(Ongoing, NotStarted);
        });
      });

      describe('Get a voting Poll', () => {
        it('Should return the correct list of movies', async () => {
          const { contract, user1 } = await deployContractFixture();
          const favoriteMovies: [string, string, string] = [
            'movie1',
            'movie2',
            'movie3',
          ];

          await contract.connect(user1).addVotingPoll(favoriteMovies, 2 * 3600);

          const votingPollMovies = await contract.getMoviesFromVotingPoll(
            await user1.getAddress(),
            1
          );

          expect(JSON.stringify(votingPollMovies[0])).to.equal(
            JSON.stringify(favoriteMovies)
          );
        });

        it('Should revert if the voting poll does not exists', async () => {
          const { contract, user1 } = await deployContractFixture();

          await expect(
            contract.getMoviesFromVotingPoll(user1.getAddress(), 1)
          ).to.be.revertedWith('Voting poll not found');
        });
      });
    });

    describe('Voting Process', () => {
      describe('Cast vote', () => {
        it('Should add a vote and increase the vote count by 1 for the chosen movie', async () => {
          const { contract, user1, user2 } = await deployContractFixture();
          const userAccount = await user1.getAddress();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600);

          await contract.connect(user1).startVotingPoll(1);

          const voteCountBeforeVote = await contract.getMoviesFromVotingPoll(
            userAccount,
            1
          );

          expect(voteCountBeforeVote[1][0]).to.equal(0);
          expect(voteCountBeforeVote[1][1]).to.equal(0);
          expect(voteCountBeforeVote[1][2]).to.equal(0);

          await contract.connect(user2).castVote(userAccount, 1, 'movie1');

          const voteCountAfterVote = await contract.getMoviesFromVotingPoll(
            userAccount,
            1
          );

          expect(voteCountAfterVote[1][0]).to.equal(1);
          expect(voteCountAfterVote[1][1]).to.equal(0);
          expect(voteCountAfterVote[1][2]).to.equal(0);
        });

        it('Should set the correct voter state and vote timestamp', async () => {
          const { contract, user1, user2 } = await deployContractFixture();
          const userAccount = await user2.getAddress();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600);

          await contract.connect(user1).startVotingPoll(1);

          expect((await contract.userVotes(userAccount, 1)).hasVoted).to.be
            .false;
          expect((await contract.userVotes(userAccount, 1)).timestamp).to.equal(
            0
          );

          const functionCall = await contract
            .connect(user2)
            .castVote(await user1.getAddress(), 1, 'movie1');
          const expectedCall = await functionCall.wait();
          const block = await ethers.provider.getBlock(
            expectedCall?.blockNumber || 0
          );
          const blockTimestamp = block?.timestamp;

          expect((await contract.userVotes(userAccount, 1)).hasVoted).to.be
            .true;
          expect((await contract.userVotes(userAccount, 1)).timestamp).to.equal(
            blockTimestamp
          );
        });

        it('Should revert if the time has exceeded the deadline', async () => {
          const { contract, user1, user2 } = await deployContractFixture();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 1);

          await contract.connect(user1).startVotingPoll(1);

          await expect(
            contract.connect(user2).castVote(user1.getAddress(), 1, 'movie1')
          ).to.be.revertedWith(
            'Duration has expired, no more votes can be cast'
          );
        });

        it('Should revert if the voter has already voted', async () => {
          const { contract, user1, user2 } = await deployContractFixture();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600);
          await contract.connect(user1).startVotingPoll(1);

          await contract
            .connect(user2)
            .castVote(user1.getAddress(), 1, 'movie1');

          await expect(
            contract.connect(user2).castVote(user1.getAddress(), 1, 'movie2')
          ).to.be.revertedWith('User account have already voted');
        });

        it('Should revert if the movie title is incorrect', async () => {
          const { contract, user1, user2 } = await deployContractFixture();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600);

          await contract.connect(user1).startVotingPoll(1);

          await expect(
            contract.connect(user2).castVote(user1.getAddress(), 1, 'movie4')
          ).to.be.revertedWith('Movie title not found');
        });

        it('Should revert if the caller is blacklisted', async () => {
          const { contract, user1, user2 } = await deployContractFixture();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600);
          await contract.connect(user1).startVotingPoll(1);

          await contract.blockUser(user2.getAddress());

          await expect(
            contract.connect(user2).castVote(user1.getAddress(), 1, 'movie1')
          ).to.be.revertedWith('Blacklisted user account, access denied');
        });

        // it('Should revert if the caller is locked', async () => {});

        it('Should revert if the contract is paused', async () => {
          const { contract, user1, user2 } = await deployContractFixture();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600);
          await contract.connect(user1).startVotingPoll(1);

          await contract.pauseContract();

          await expect(
            contract.connect(user2).castVote(user1.getAddress(), 1, 'movie1')
          ).to.be.revertedWith('Contract is paused');
        });

        it('Should revert if the voting poll does not exists', async () => {
          const { contract, user1, user2 } = await deployContractFixture();

          await expect(
            contract.connect(user2).castVote(user1.getAddress(), 1, 'movie1')
          ).to.be.revertedWith('Voting poll not found');
        });

        it('Should revert if not in the correct voting state', async () => {
          const { contract, NotStarted, Ongoing, user1, user2 } =
            await deployContractFixture();
          const userAccount = user1.getAddress();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600);

          expect(
            (await contract.votingPolls(userAccount, 1)).votingState
          ).to.equal(NotStarted);

          await expect(
            contract.connect(user2).castVote(userAccount, 1, 'movie1')
          )
            .to.be.revertedWithCustomError(contract, 'CustomError_InvalidState')
            .withArgs(NotStarted, Ongoing);
        });
      });

      describe('Count votes', () => {
        it('Should count the votes, set the winner and emit a massage', async () => {
          const { contract, owner, user1, user2, user3 } =
            await deployContractFixture();
          const pollOwner = await owner.getAddress();

          await contract.addVotingPoll(['movie1', 'movie2', 'movie3'], 5);
          await contract.startVotingPoll(1);

          const votesBeforeVoting = await contract.getMoviesFromVotingPoll(
            pollOwner,
            1
          );

          expect(votesBeforeVoting[1][0]).to.equal(0);
          expect(votesBeforeVoting[1][1]).to.equal(0);
          expect(votesBeforeVoting[1][2]).to.equal(0);

          await contract.connect(user1).castVote(pollOwner, 1, 'movie1');
          await contract.connect(user2).castVote(pollOwner, 1, 'movie1');
          await contract.connect(user3).castVote(pollOwner, 1, 'movie3');

          const votesAfterVoting = await contract.getMoviesFromVotingPoll(
            pollOwner,
            1
          );

          expect(votesAfterVoting[1][0]).to.equal(2);
          expect(votesAfterVoting[1][1]).to.equal(0);
          expect(votesAfterVoting[1][2]).to.equal(1);

          await expect(contract.countVotes(1))
            .to.emit(contract, 'WinnerDeclared')
            .withArgs('Congratulations, we have a winner!', 'movie1', false);
        });

        it('Should count the votes; if it is a tie, set isTie to true and emit a massage', async () => {
          const { contract, owner, user1, user2 } =
            await deployContractFixture();
          const pollOwner = await owner.getAddress();

          await contract.addVotingPoll(['movie1', 'movie2', 'movie3'], 4);
          await contract.startVotingPoll(1);

          const votesBeforeVoting = await contract.getMoviesFromVotingPoll(
            pollOwner,
            1
          );

          expect(votesBeforeVoting[1][0]).to.equal(0);
          expect(votesBeforeVoting[1][1]).to.equal(0);
          expect(votesBeforeVoting[1][2]).to.equal(0);

          await contract.connect(user1).castVote(pollOwner, 1, 'movie1');
          await contract.connect(user2).castVote(pollOwner, 1, 'movie2');

          const votesAfterVoting = await contract.getMoviesFromVotingPoll(
            pollOwner,
            1
          );

          expect(votesAfterVoting[1][0]).to.equal(1);
          expect(votesAfterVoting[1][1]).to.equal(1);
          expect(votesAfterVoting[1][2]).to.equal(0);

          await expect(contract.countVotes(1))
            .to.emit(contract, 'WinnerDeclared')
            .withArgs('The poll ended in a tie', '', true);
        });

        it('Should set the voting polls state to Finished', async () => {
          const { contract, owner, Finished, NotStarted, Ongoing } =
            await deployContractFixture();

          await contract.addVotingPoll(['movie1', 'movie2', 'movie3'], 1);

          expect(
            (await contract.votingPolls(owner.getAddress(), 1)).votingState
          ).to.equal(NotStarted);

          await contract.startVotingPoll(1);

          expect(
            (await contract.votingPolls(owner.getAddress(), 1)).votingState
          ).to.equal(Ongoing);

          await contract.countVotes(1);

          expect(
            (await contract.votingPolls(owner.getAddress(), 1)).votingState
          ).to.equal(Finished);
        });

        it('Should revert if the deadline is not reached', async () => {
          const { contract } = await deployContractFixture();

          await contract.addVotingPoll(
            ['movie1', 'movie2', 'movie3'],
            2 * 3600
          );
          await contract.startVotingPoll(1);

          await expect(contract.countVotes(1)).to.be.revertedWith(
            'Voting in progress, unable to end before deadline'
          );
        });

        it('Should revert if the caller is blacklisted', async () => {
          const { contract, user1 } = await deployContractFixture();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 1);
          await contract.connect(user1).startVotingPoll(1);

          await contract.blockUser(user1.getAddress());

          await expect(
            contract.connect(user1).countVotes(1)
          ).to.be.revertedWith('Blacklisted user account, access denied');
        });

        // it('Should revert if the caller is locked', async () => {});

        it('Should revert if the contract is paused', async () => {
          const { contract, user1 } = await deployContractFixture();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 1);
          await contract.connect(user1).startVotingPoll(1);

          await contract.pauseContract();

          await expect(
            contract.connect(user1).countVotes(1)
          ).to.be.revertedWith('Contract is paused');
        });

        it('Should revert if the voting poll does not exists', async () => {
          const { contract } = await deployContractFixture();

          await expect(contract.countVotes(1)).to.be.revertedWith(
            'Voting poll not found'
          );
        });

        it('Should revert if not in the correct voting state', async () => {
          const { contract, NotStarted, Ongoing, user1 } =
            await deployContractFixture();
          const userAccount = user1.getAddress();

          await contract
            .connect(user1)
            .addVotingPoll(['movie1', 'movie2', 'movie3'], 2 * 3600);

          expect(
            (await contract.votingPolls(userAccount, 1)).votingState
          ).to.equal(NotStarted);

          await expect(contract.connect(user1).countVotes(1))
            .to.be.revertedWithCustomError(contract, 'CustomError_InvalidState')
            .withArgs(NotStarted, Ongoing);
        });
      });
    });
  });
});
