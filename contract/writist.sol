// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
    function transfer(address, uint256) external returns (bool);

    function approve(address, uint256) external returns (bool);

    function transferFrom(
        address,
        address,
        uint256
    ) external returns (bool);

    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function allowance(address, address) external view returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract Articlereview {
    uint256 private articlesLength = 0;
    address private cUsdTokenAddress =
        0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
    address private owner;

    /// @dev Structure of an article
    /// @param owner is the publishing house
    /// @param author is the name of the author
    struct Article {
        address payable owner;
        string author;
        string title;
        string article;
        uint256 price;
        uint256 sold;
    }

    /// @dev structure of a review
    /// @param rate is the rating of the artcile between 1 and 5
    /// @param recommend is a bool value of whether reviewer would recommend the article to other viewers
    struct Review {
        address reviewer;
        string review;
        uint256 rate;
        bool recommend;
    }

    // maps a Review array to the id of the article
    mapping(uint256 => Review[]) private reviews;
    // keeps track of users that have already reviewed an article
    mapping(address => mapping(uint256 => bool)) public reviewed;
    // keeps track of whether a user can review an article(they have to buy the article first)
    mapping(address => mapping(uint256 => bool)) public canReview;

    // Creating a cons "Already reviwed"tructor to initialize the owner variable
    constructor() {
        owner = msg.sender;
    }

    // Creating an onlyOwner modifier
    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only the owner of this article can perform this function"
        );
        _;
    }
    // checks if article exists
    modifier exist(uint256 _index) {
        require(exists[_index], "Query of non existent article");
        _;
    }

    mapping(uint256 => Article) private articles;

    // keeps track of articles that exist
    mapping(uint256 => bool) private exists;

    // Uploading articles
    function uploadArticle(
        string memory _author,
        string memory _title,
        string memory _article,
        uint256 _price
    ) public {
        require(bytes(_author).length > 0, "Empty author");
        require(bytes(_title).length > 0, "Empty title");
        require(bytes(_article).length > 0, "Empty article");
        require(_price > 0, "Invalid price");
        uint256 _sold = 0;
        articles[articlesLength] = Article(
            payable(msg.sender),
            _author,
            _title,
            _article,
            _price,
            _sold
        );
        exists[articlesLength] = true; // initialised as true since article has been created
        articlesLength++;
    }

    /// @dev Returns the data of article of _index
    function readArticle(uint256 _index)
        public
        view
        exist(_index)
        returns (
            address payable,
            string memory,
            string memory,
            string memory,
            uint256,
            uint256
        )
    {
        return (
            articles[_index].owner,
            articles[_index].author,
            articles[_index].title,
            articles[_index].article,
            articles[_index].price,
            articles[_index].sold
        );
    }

    /// @dev allow users to buy an article
    function buyArticle(uint256 _index) public payable exist(_index) {
        require(
            articles[_index].owner != msg.sender,
            "Owner can't buy his own article"
        );
        require(
            IERC20Token(cUsdTokenAddress).transferFrom( // transfering funds from the initiator of this function to the owner of the product
                msg.sender,
                articles[_index].owner,
                articles[_index].price
            ),
            "Transfer failed."
        );
        articles[_index].sold++;
        // makes sure that only one review is allowed per user
        if (canReview[msg.sender][_index] == false) {
            canReview[msg.sender][_index] = true; // to ensure fair reviews, only users who bought an article can review that article
        }
    }

    /// @dev gifts an article to another user
    /// @param receiver is the address to gift the article
    function giftArticle(uint256 _index, address receiver)
        external
        payable
        exist(_index)
    {
        require(
            articles[_index].owner != msg.sender,
            "Owner can't buy his own article"
        );
        require(receiver != address(0), "Invalid receiver");
        require(
            IERC20Token(cUsdTokenAddress).transferFrom( // transfering funds from the initiator of this function to the owner of the product
                msg.sender,
                articles[_index].owner,
                articles[_index].price
            ),
            "Transfer failed."
        );
        articles[_index].sold++;
        // makes sure that only one review is allowed per user
        if (canReview[receiver][_index] == false) {
            canReview[receiver][_index] = true; // to ensure fair reviews, only users who bought an article can review that article
        }
    }

    /// @dev allow users to review an article they have bought
    function review(
        uint256 _index,
        uint256 _rate,
        string memory _review,
        bool _recommend
    ) external exist(_index) {
        require(canReview[msg.sender][_index], "You need to buy article first");
        require(!reviewed[msg.sender][_index], "Already reviwed");
        require(
            articles[_index].owner != msg.sender,
            "Owner can't review his own article"
        );
        require(_rate > 0 && _rate <= 5, "Invalid rate");
        require(bytes(_review).length > 0, "Empty review");
        reviews[_index].push(Review(msg.sender, _review, _rate, _recommend));
        reviewed[msg.sender][_index] = true;
    }

    /// @dev deletes an article and the associated review array
    /// @notice the values of article are reset and exists is set to false
    function deleteArticle(uint256 _index) public onlyOwner exist(_index) {
        delete reviews[_index];
        delete articles[_index];
        exists[_index] = false;
    }

    /// @dev Returns a bool about if article exist
    function getExist(uint256 _index) public view returns (bool) {
        return (exists[_index]);
    }

    // Get articles length in the array mappinig
    function getArticlesLength() public view returns (uint256) {
        return (articlesLength);
    }

    /// @dev Returns reviews for an article
    function getReviews(uint256 _index)
        public
        view
        exist(_index)
        returns (Review[] memory)
    {
        return reviews[_index];
    }
}
