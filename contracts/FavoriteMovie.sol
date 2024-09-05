// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Author: @rowpacmal

contract FavoriteMovie {
    // Contract Constant Variables
    uint256 private constant listLimit = 3;

    // Contract Types
    enum VotingState {
        NotStarted,
        Ongoing,
        Finished
    }

    struct Movie {
        string title;
        uint256 voteCount;
    }

    struct Vote {
        bool hasVoted;
        uint256 timestamp;
    }

    struct VotingPoll {
        address owner;
        uint256 votingIndex;
        uint256 votingDeadline;
        string winningMovie;
        bool exists;
        bool isTie;
        VotingState votingState;
        Movie[listLimit] favoriteMovies;
    }

    // Contract State Variables
    address public contractOwner;
    bool public contractPaused;
    uint256 public votingIndex;

    mapping(address => bool) public blacklist;
    mapping(address => bool) public userLocked;
    mapping(address => mapping(uint256 => Vote)) public userVotes;
    mapping(address => mapping(uint256 => VotingPoll)) public votingPolls;

    // Contract Events
    event FallbackCalled(string message, address callAddress);
    event WinnerDeclared(string message, string movieTitle, bool isTie);

    // Contract Custom Errors
    error CustomError_FunctionNotFound(
        address callAddress,
        bool functionExists
    );
    error CustomError_InvalidState(
        VotingState currentState,
        VotingState requiredState
    );

    // Contract Constructor
    constructor() {
        contractOwner = msg.sender;
    }

    // Contract Modifiers
    modifier inState(
        address _userAccount,
        uint256 _votingIndex,
        VotingState _state
    ) {
        VotingState _votingState = votingPolls[_userAccount][_votingIndex]
            .votingState;

        if (_votingState != _state) {
            revert CustomError_InvalidState(_votingState, _state);
        }
        _;
    }

    modifier isContractOwner() {
        if (msg.sender != contractOwner) {
            revert("Only the owner can modify this contract");
        }
        _;
    }

    modifier isNotBanned() {
        if (blacklist[msg.sender]) {
            revert("Blacklisted user account, access denied");
        }
        _;
    }

    modifier isNotLocked() {
        if (userLocked[msg.sender]) {
            revert("Call in progress, please hold...");
        }
        userLocked[msg.sender] = true;
        _;
        userLocked[msg.sender] = false;
    }

    modifier isNotOwner(address _address) {
        if (_address == contractOwner) {
            revert("Owner status cannot be modified");
        }
        _;
    }

    modifier isNotPaused() {
        if (contractPaused) {
            revert("Contract is paused");
        }
        _;
    }

    modifier votingPollExist(address _userAccount, uint256 _votingIndex) {
        if (!votingPolls[_userAccount][_votingIndex].exists) {
            revert("Voting poll not found");
        }
        _;
    }

    // Contract Fallback Functions
    fallback() external {
        emit FallbackCalled("Fallback call, function not found", msg.sender);

        revert CustomError_FunctionNotFound(msg.sender, false);
    }

    // Contract Owner Functions
    function blockUser(
        address _userAccount
    )
        external
        isContractOwner
        isNotOwner(_userAccount)
        isNotLocked
        isNotPaused
    {
        blacklist[_userAccount] = true;
    }

    function pauseContract() external isContractOwner isNotLocked {
        require(!contractPaused, "Contract has already been paused");

        contractPaused = true;
    }

    function transferOwnership(
        address _newOwner
    ) external isContractOwner isNotLocked isNotPaused {
        require(
            !blacklist[_newOwner],
            "Blacklisted user accounts cannot take ownership"
        );

        contractOwner = _newOwner;
    }

    function unblockUser(
        address _userAccount
    )
        external
        isContractOwner
        isNotOwner(_userAccount)
        isNotLocked
        isNotPaused
    {
        blacklist[_userAccount] = false;
    }

    function unpauseContract() external isContractOwner isNotLocked {
        require(contractPaused, "Contract has already been unpaused");

        contractPaused = false;
    }

    // Contract User Functions
    function addVotingPoll(
        string[listLimit] memory _movieTitles,
        uint256 _duration
    ) external isNotBanned isNotLocked isNotPaused {
        ++votingIndex;

        VotingPoll storage _votingPoll = votingPolls[msg.sender][votingIndex];

        _votingPoll.owner = msg.sender;
        _votingPoll.votingIndex = votingIndex;
        _votingPoll.votingDeadline = block.timestamp + _duration;
        _votingPoll.winningMovie = "";
        _votingPoll.exists = true;
        _votingPoll.votingState = VotingState.NotStarted;

        for (uint256 i = 0; i < listLimit; ++i) {
            _votingPoll.favoriteMovies[i] = Movie({
                title: _movieTitles[i],
                voteCount: 0
            });
        }
    }

    function castVote(
        address _userAccount,
        uint256 _votingIndex,
        string memory _movieTitle
    )
        external
        isNotBanned
        isNotLocked
        isNotPaused
        votingPollExist(_userAccount, _votingIndex)
        inState(_userAccount, _votingIndex, VotingState.Ongoing)
    {
        VotingPoll storage _votingPoll = votingPolls[_userAccount][
            _votingIndex
        ];

        require(
            block.timestamp < _votingPoll.votingDeadline,
            "Duration has expired, no more votes can be cast"
        );

        Vote storage _voter = userVotes[msg.sender][_votingIndex];

        require(!_voter.hasVoted, "User account have already voted");

        bool _movieFound;

        for (uint256 i = 0; i < listLimit; ++i) {
            if (
                keccak256(bytes(_votingPoll.favoriteMovies[i].title)) ==
                keccak256(bytes(_movieTitle))
            ) {
                _votingPoll.favoriteMovies[i].voteCount += 1;

                _movieFound = true;

                break;
            }
        }

        require(_movieFound, "Movie title not found");

        _voter.hasVoted = true;
        _voter.timestamp = block.timestamp;

        assert(block.timestamp < _votingPoll.votingDeadline);
    }

    function countVotes(
        uint256 _votingIndex
    )
        external
        isNotBanned
        isNotLocked
        isNotPaused
        votingPollExist(msg.sender, _votingIndex)
        inState(msg.sender, _votingIndex, VotingState.Ongoing)
    {
        VotingPoll storage _votingPoll = votingPolls[msg.sender][_votingIndex];

        require(
            block.timestamp >= _votingPoll.votingDeadline,
            "Voting in progress, unable to end before deadline"
        );

        string memory _emitMessage;
        string memory _leadingTitle;
        uint256 _totalVotes;
        uint256 _winnerCount;

        for (uint256 i = 0; i < listLimit; ++i) {
            if (_votingPoll.favoriteMovies[i].voteCount > _totalVotes) {
                _totalVotes = _votingPoll.favoriteMovies[i].voteCount;
                _leadingTitle = _votingPoll.favoriteMovies[i].title;
                _winnerCount = 1;
            } else if (_votingPoll.favoriteMovies[i].voteCount == _totalVotes) {
                _winnerCount++;
            }
        }

        if (_winnerCount > 1) {
            _votingPoll.isTie = true;
            _emitMessage = "The poll ended in a tie";
        } else {
            _votingPoll.winningMovie = _leadingTitle;
            _emitMessage = "Congratulations, we have a winner!";
        }

        emit WinnerDeclared(
            _emitMessage,
            _votingPoll.winningMovie,
            _votingPoll.isTie
        );

        _votingPoll.votingState = VotingState.Finished;
    }

    function getMoviesFromVotingPoll(
        address _userAccount,
        uint256 _votingIndex
    )
        external
        view
        votingPollExist(_userAccount, _votingIndex)
        returns (
            string[listLimit] memory movieList,
            uint256[listLimit] memory voteCountList
        )
    {
        for (uint256 i = 0; i < listLimit; ++i) {
            movieList[i] = votingPolls[_userAccount][_votingIndex]
                .favoriteMovies[i]
                .title;

            voteCountList[i] = votingPolls[_userAccount][_votingIndex]
                .favoriteMovies[i]
                .voteCount;
        }

        return (movieList, voteCountList);
    }

    function startVotingPoll(
        uint256 _votingIndex
    )
        external
        isNotBanned
        isNotLocked
        isNotPaused
        votingPollExist(msg.sender, _votingIndex)
        inState(msg.sender, _votingIndex, VotingState.NotStarted)
    {
        votingPolls[msg.sender][_votingIndex].votingState = VotingState.Ongoing;
    }
}
