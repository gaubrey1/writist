// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract Articlereview {

    uint internal articlesLength = 0;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
    address internal owner;

    struct Article {
        address payable owner;
        string author;
        string title;
        string article;
        uint price;
        uint reviews;
        bool isDeleted;
    }

// Creating a constructor to initialize the owner variable
    constructor() {
        owner = msg.sender;
    }

// Creating an onlyowner modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner of this article can perform this function");
        _;
    }

    mapping (uint => Article) internal articles;

// Uploading articles
    function uploadArticle(
        string memory _author,
        string memory _title,
        string memory _article, 
        uint _price
    ) public {
        uint _reviews = 0;
        bool _isDeleted = false; // Assigning a default value of false to the isDeleted property
        articles[articlesLength] = Article(
            payable(msg.sender),
            _author,
            _title,
            _article,
            _price,
            _reviews,
            _isDeleted
        );
        articlesLength++;
    }

// Reading the available articles uploaded
    function readArticle(uint _index) public view returns (
        address payable,
        string memory,
        string memory, 
        string memory, 
        uint,
        uint
    ) {
        return (
            articles[_index].owner,
            articles[_index].author,
            articles[_index].title,
            articles[_index].article, 
            articles[_index].price,
            articles[_index].reviews
        );
    }
    
    function buyArticle(uint _index) public payable  {
        require(
          IERC20Token(cUsdTokenAddress).transferFrom( // transfering funds from the initiator of this function to the owner of the product
            msg.sender,
            articles[_index].owner,
            articles[_index].price
          ),
          "Transfer failed."
        );
        articles[_index].reviews++;
    }

// Assign true to the delete property
    function deleteArticle(uint _index) public onlyOwner {
        articles[_index].isDeleted = true;
    }

// Get the value of the isDeleted property
    function isDeleted(uint _index) public view returns (bool) {
        return (articles[_index].isDeleted);
    }

// Get articles length in the array mappinig
    function getArticlesLength() public view returns (uint) {
        return (articlesLength);
    }
}