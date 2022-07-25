import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import erc20Abi from "../contract/erc20.abi.json";
import writistAbi from "../contract/writist.abi.json";

const ERC20_DECIMALS = 18;
const writistContractAddress = "0xdbc3eb6ee0ce4b381eD0b30dDD7cBF7320e20d8a";
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

let kit;
let contract;
let userWalletAddress;
let articles = [];

// HEADER BUTTONS
const header = document.querySelector("header");
const navLink = document.querySelector(".navigation ul");
const headerWalletBal = document.querySelector(".user-acct-balance");
const articlesContainer = document.querySelector(".articles-container");
const displayedArticlesContainer = document.querySelector(".articles");
const headerConnectWalletBtn = document.querySelector(".header-connect-wallet");
const headerReviewArticleBtn = document.querySelector(
  ".header-review-article-btn"
);
const headerUploadArticleBtn = document.querySelector(
  ".header-upload-article-btn"
);

headerConnectWalletBtn.addEventListener("click", async function () {
  await connectToWallet();
  await userBalance();

  headerReviewArticleBtn.classList.replace("hide", "show");
  headerUploadArticleBtn.classList.replace("hide", "show");
  headerWalletBal.classList.replace("hide", "show");

  navLink.classList.replace("show", "hide");
  headerConnectWalletBtn.classList.replace("show", "hide");
});

headerUploadArticleBtn.addEventListener("click", function () {
  uploadArticleForm.classList.replace("hide", "show");
  header.classList.replace("show-flex", "hide");
});

headerReviewArticleBtn.addEventListener("click", async function () {
  await storedArticles();
  await userBalance();

  header.classList.replace("show-flex", "hide");
  articlesContainer.classList.replace("hide", "show-flex");
});
// ENDS HERE

// ARTICLE UPLOAD
const uploadArticleBtn = document.querySelector(".article-btn button");
const uploadArticleForm = document.querySelector(".user-article");

uploadArticleBtn.addEventListener("click", async function () {
  notification("Adding a new article, please wait");

  const articleTitle = document.querySelector("#title").value;
  const articleText = document.querySelector("#article").value;
  const articleAuthor = document.querySelector("#author").value;
  const articleAmount = document.querySelector("#amount").value;

  const article = [
    articleAuthor,
    articleTitle,
    articleText,
    new BigNumber(articleAmount).shiftedBy(ERC20_DECIMALS).toString() // converting the passed price to an ERC20_DECIMAL number
  ];

  try {
    const result = await contract.methods // calling the uploadArticle function defined in the smart contract
      .uploadArticle(...article)
      .send({ from: kit.defaultAccount });

    notification(`Successfully added ${article[1]} article`);

    uploadArticleForm.classList.replace("show", "hide");
    articlesContainer.classList.replace("hide", "show-flex");
  } catch (error) {
    notification(`Sorry, we were unable to add ${article[1]} article`);
  }

  storedArticles();
  notificationOff();
});
// ENDS HERE

// REVIEW ARTICLES
displayedArticlesContainer.addEventListener("click", async function (e) {
  // if the target element has an id
  if (e.target.className.includes("buy") && e.target.parentNode.id) {
    const articleIndex = e.target.parentNode.id; // getting the index of the article the user wants to buy when the buy button is clicked

    if (userWalletAddress === articles[articleIndex].owner) {
      // if the user tries to buy his uploaded article
      notification("Sorry, you can't buy your uploaded articles");
    } else {
      // when the user requests to buy another user's article
      notification(
        `Approving request to buy ${articles[articleIndex].title} article, please wait`
      );

      try {
        await purchaseApproval(articles[articleIndex].price); // approving the purchase request using the purchaseApproval function and passing the price
      } catch (error) {
        console.log("Error: " + error);
      }

      notification(
        `Request approved, currently purchasing ${articles[articleIndex].title} article`
      );
      try {
        const result = await contract.methods // calling the buy function defined in the smart contract
          .buyArticle(articleIndex)
          .send({ from: kit.defaultAccount });

        notification(
          `Successfully purchased ${articles[articleIndex].title} article`
        );

        storedArticles();
        userBalance();
        notificationOff();
      } catch (error) {
        console.log("Error " + error);
      }
    }
  }
  // if the button clicked has the delete-btn class, call the delete function
  else if (
    e.target.className.includes("delete-btn") &&
    e.target.parentNode.id
  ) {
    const articleIndex = e.target.parentNode.id;
    deleteArticle(articleIndex); //  Function number 8
  }
});
// ENDS HERE

// CUSTOM FUNCTIONS

// 1. Article Template Function
const articleTemplate = (article) => {
  return `
    <div class="article-img">
      <img
        src="https://th.bing.com/th/id/R.b1c7f4a53f692a9262901fe4fab79958?rik=WiPNDSZAvEerBw&riu=http%3a%2f%2fcoachestrainingblog.com%2fbecomeacoach%2fwp-content%2fuploads%2f2015%2f09%2farticle-coaching.jpeg&ehk=WqH4cGgU7rztnypYj9kwKsZ9yTPk8yqc%2bHYlEIBBv7E%3d&risl=&pid=ImgRaw&r=0"
        alt="Image"
      />
    </div>

    <div class="article-details">
      <div class="article-author">
        <h3>
          ${article.author}
          <span class="author-wallet">${identiconTemplate(article.owner)}</span>
        </h3>
        <p>${article.title}</p>
        <p class="price">${article.price
          .shiftedBy(-ERC20_DECIMALS)
          .toFixed(2)} cUSD</p>
      </div>

      <div class="article-footer">
        <p class="purchased">Sold: ${article.purchased}</p>
        <div id=${article.index} class="buy-btns">
          ${deleteBtnDisplay(article)}
        </div>
      </div>
    </div>
  `;
};
// Ends Here

// 2. Display Available Article Function
const availableArticles = () => {
  const articlesContainer = document.querySelector(".articles");
  const articlesContainerH1 = document.querySelector(".articles-container h1");
  articlesContainer.innerHTML = "";

  if (articles.length < 1) {
    // if no articles has been uploaded yet that is if the length property is less than 1
    articlesContainerH1.innerHTML = "No Articles Available For Sale";
  } else {
    // if there are articles in the articles array that is if the length property is greater than 1
    articles.forEach((article) => {
      if (!article.isDeleted) {
        const newArticle = document.createElement("div");
        newArticle.className = "article";
        newArticle.innerHTML = articleTemplate(article);

        articlesContainer.appendChild(newArticle);
      }
    });
  }
};
// Ends Here

// 3. Identicon Template For Article Authors
const identiconTemplate = (walletAddress) => {
  const icon = blockies
    .create({
      seed: walletAddress,
      size: 8,
      scale: 16
    })
    .toDataURL();

  return `
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${walletAddress}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${walletAddress}">
    </a>
  `;
};
// Ends Here

// 4. Notification Function
const notification = (notice) => {
  const notificationText = document.querySelector(".notification h1");
  const notificationContainer = document.querySelector(".notification");
  notificationContainer.classList.replace("hide", "show");

  notificationText.textContent = notice;
};
const notificationOff = () => {
  const notificationContainer = document.querySelector(".notification");
  notificationContainer.classList.replace("show", "hide");
};
// Ends Here

// 5. Get Logged In User Account Balance
const userBalance = async () => {
  const celoBalance = await kit.getTotalBalance(kit.defaultAccount); // getting the celo balance of the logged in user
  const cUSDBalance = celoBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2); // converting the celo balance to a cUSD balance to be displayed
  const displayedBalance = `
    <p>${cUSDBalance} cUSD</p>
  `;
  document.querySelector(".user-acct-balance").innerHTML = displayedBalance;
};
// Ends

// 6. Stored Articles Function
const storedArticles = async () => {
  const articlesLength = await contract.methods.getArticlesLength().call(); // calling the getArticlesLength function and assigning it to a variable
  const articlesList = [];

  for (let i = 0; i < articlesLength; i++) {
    let article = new Promise(async function (resolve, reject) {
      // creating a promise to store all articles
      let savedArticles = await contract.methods.readArticle(i).call(); // calling the read article function defined in the contract and assigning it to a variable
      let isDeleted = await contract.methods.isDeleted(i).call(); //  calling the isDeleted method on the smart contract

      resolve({
        index: i,
        owner: savedArticles[0],
        author: savedArticles[1],
        title: savedArticles[2],
        text: savedArticles[3],
        price: new BigNumber(savedArticles[4]),
        purchased: savedArticles[5],
        isDeleted
      });
      reject((err) => {
        console.log("Error: " + err);
      });
    });
    articlesList.push(article);
  }

  articles = await Promise.all(articlesList); // awaiting for all promises to be resolved before assigning all the articles to the articles array

  availableArticles();
};
//  Ends

// 7. Review Approval Function
const purchaseApproval = async (price) => {
  notification("Waiting for purchase approval");
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress); //initializing a cUSD contract using the contract aUSD address

  const result = await cUSDContract.methods
    .approve(writistContractAddress, price) //approving purchase request from the initiator of the request
    .send({ from: kit.defaultAccount });

  notification("Purchase approved. Thank you for your patience.");
  return result;
};
// Ends Here

// 8. Delete Function
async function deleteArticle(index) {
  try {
    notification("Deleting this article, please wait");
    const delArticle = await contract.methods
      .deleteArticle(index)
      .send({ from: kit.defaultAccount });
    const isDel = await contract.methods.isDeleted(index).call;
    notification("Article successfully deleted");

    await storedArticles();
    notificationOff();
  } catch (error) {
    console.log(error);
  }
}
// Ends Here

// 9. Display Delete Button
function deleteBtnDisplay(article) {
  if (article.owner === userWalletAddress) {
    return `
      <button class="delete-btn">Delete</button>
    `;
  } else {
    return `
      <button class="buy-article">Buy</button>
    `;
  }
}

// ENDS

// CONNECTING TO THE CELO EXTENSION WALLET
const connectToWallet = async () => {
  if (window.celo) {
    notification("Connecting to your wallet, please wait");

    try {
      await window.celo.enable();
      notification("Wallet connected");

      const web3 = new Web3(window.celo);
      kit = newKitFromWeb3(web3);

      const accounts = await kit.web3.eth.getAccounts();
      kit.defaultAccount = accounts[0];

      userWalletAddress = kit.defaultAccount;

      contract = new kit.web3.eth.Contract(writistAbi, writistContractAddress);
      notificationOff();
    } catch (error) {
      console.log(error);
    }
  } else {
    notification("Please install the CeloExtensionWallet before proceeding");
  }
  notificationOff();
};

// ENDS HERE
