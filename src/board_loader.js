const pasteAreaElement = document.getElementById("paste-area");
const pastedImageElement = document.getElementById("pasted-image");

import { ROW, COLUMN, VACANT } from "./constants.js";

let m_loadedStateFromImage = false;
let m_loadedBoard = [];

export function BoardLoader(board, canvas) {
  this.board = board;
  this.canvas = canvas;

  setUpPasteability(this);
}

BoardLoader.prototype.resetBoard = function () {
  // Reload the board from the image, or reset the board
  // (have to iterate manually (not use this.board = ) to preserve the board reference that's passed around to all the files
  for (let r = 0; r < ROW; r++) {
    for (let c = 0; c < COLUMN; c++) {
      this.board[r][c] = m_loadedStateFromImage ? m_loadedBoard[r][c] : VACANT;
    }
  }
};

// Get whether the board has been loaded from an image
BoardLoader.prototype.didLoadBoardStateFromImage = function () {
  return m_loadedStateFromImage;
};

BoardLoader.prototype.getBoardStateFromImage = function (img) {
  var dummy_canvas = document.getElementById("dummy-canvas");
  var context = dummy_canvas.getContext("2d");
  dummy_canvas.width = img.width;
  dummy_canvas.height = img.height;
  context.drawImage(img, 0, 0);

  const cropOffset = -0.3;
  const SQ = (img.height / 20 + img.width / 10) / 2 + cropOffset;
  const rgbEmptyThreshold = 60; // If all three channels are <60/255, then the cell is "empty"

  // Iterate over the image and read the square colors into the board
  for (let c = 0; c < COLUMN; c++) {
    for (let r = 0; r < ROW; r++) {
      const x = Math.round((c + 0.5) * SQ);
      const y = Math.round((r + 0.5) * SQ);
      const pixelData = context.getImageData(x, y, 1, 1).data;
      if (
        Math.max(pixelData[0], pixelData[1], pixelData[2]) > rgbEmptyThreshold
      ) {
        this.board[r][c] = "rgba(" + pixelData.join(",") + ")";
      } else {
        this.board[r][c] = VACANT;
      }
      context.fillStyle = "GREEN";
      context.fillRect(x, y, 5, 5);
    }
  }

  // Edit out the currently falling piece from the boardstate
  clearFloatingPiece(this.board);
  m_loadedBoard = JSON.parse(JSON.stringify(this.board)); // Save a copy of the loaded board
  this.canvas.drawBoard();
  m_loadedStateFromImage = true;
};

// Remove the piece from midair when loading a board from a screenshot
function clearFloatingPiece(board) {
  // Start from the bottom, look for an empty row, and then clear all rows above that
  let startedClearing = false;
  for (let r = ROW - 1; r >= 0; r--) {
    if (startedClearing) {
      for (let c = 0; c < COLUMN; c++) {
        board[r][c] = VACANT;
      }
    } else {
      let rowEmpty = true;
      for (let c = 0; c < COLUMN; c++) {
        if (board[r][c] != VACANT) {
          rowEmpty = false;
          break;
        }
      }
      if (rowEmpty) {
        startedClearing = true;
      }
    }
  }
}

function setUpPasteability(boardLoaderThis) {
  // When an image is pasted, get the board state from it
  pasteAreaElement.onpaste = function (event) {
    // use event.originalEvent.clipboard for newer chrome versions
    var items = (event.clipboardData || event.originalEvent.clipboardData)
      .items;
    // find pasted image among pasted items
    var blob = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") === 0) {
        blob = items[i].getAsFile();
      }
    }
    // load image if there is a pasted image
    if (blob !== null) {
      var reader = new FileReader();
      reader.onload = function (event) {
        pastedImageElement.onload = function () {
          boardLoaderThis.getBoardStateFromImage(pastedImageElement);
        };
        pastedImageElement.src = event.target.result;
      };
      reader.readAsDataURL(blob);
    }
  };
}