const QRCode = require("qrcode");
const { PDFDocument, rgb } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

// Função para ler o arquivo JSON e retornar o array de dados
function loadDataFromFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        return reject(err);
      }
      try {
        const jsonData = JSON.parse(data);
        resolve(jsonData);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

async function createQRCodePDF(dataArray) {
  try {
    const pdfDoc = await PDFDocument.create();
    const pageWidth = 595; // Largura da página A4 em pontos
    const pageHeight = 842; // Altura da página A4 em pontos
    const margin = 50; // Margem em pontos
    const qrCodeSize = 200; // Tamanho do QR Code em pontos
    const qrPerPage = 6; // Número de QR Codes por página

    // Função para adicionar QR Codes a uma página
    async function addPageWithQRs(startIndex) {
      const currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      const { width, height } = currentPage.getSize();

      let x = margin;
      let y = height - margin - qrCodeSize;

      for (
        let i = startIndex;
        i < startIndex + qrPerPage && i < dataArray.length;
        i++
      ) {
        const item = dataArray[i];
        const qrCodeData = JSON.stringify(item); // Converte o objeto para JSON string
        const qrCodeDataURL = await QRCode.toDataURL(qrCodeData);
        const base64Data = qrCodeDataURL.replace(
          /^data:image\/png;base64,/,
          ""
        );

        // Adiciona o QR Code ao PDF
        const qrImage = await pdfDoc.embedPng(base64Data);
        const qrImageDims = qrImage.scale(qrCodeSize / qrImage.width);

        // Desenha o QR Code
        currentPage.drawImage(qrImage, {
          x: x,
          y: y,
          width: qrImageDims.width,
          height: qrImageDims.height,
        });

        // Adiciona o texto acima do QR Code
        let qrCodeText = `${item.posicao}`; // Obtém o valor da posição do item


        // Medir o comprimento do texto para centralização
        const textWidth = qrCodeText.length * 10; // Estimativa, ajuste conforme necessário
        const textSize = 12; // Tamanho da fonte
        const fontSize = qrImageDims.height / 6; // Ajuste o tamanho da fonte para caber acima do QR Code

        // Adiciona o texto centralizado
        currentPage.drawText(qrCodeText, {
          x: x + (qrImageDims.width - textWidth) / 2,
          y: y + qrImageDims.height + 10, // Ajusta a posição do texto acima do QR Code
          size: fontSize, // Tamanho da fonte
          color: rgb(0, 0, 0), // Cor do texto (preto)
          maxWidth: qrImageDims.width, // Largura máxima do texto
          lineHeight: fontSize + 4, // Espaçamento entre linhas
        });

        x += qrCodeSize + margin;

        // Se o próximo QR Code ultrapassar o limite da página, move para a próxima linha
        if (x + qrCodeSize > width - margin) {
          x = margin;
          y -= qrCodeSize + margin;
        }
      }
    }

    // Adiciona páginas com QR Codes
    let startIndex = 0;
    while (startIndex < dataArray.length) {
      await addPageWithQRs(startIndex);
      startIndex += qrPerPage;
    }

    // Salva o PDF e escreve no sistema de arquivos
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync("qr_codes.pdf", pdfBytes);
    console.log("PDF com QR Codes criado com sucesso!");
  } catch (err) {
    console.error("Erro ao criar PDF com QR Codes:", err);
  }
}

// Carrega dados do arquivo JSON e chama a função para criar o PDF
const jsonFilePath = "./OrdenedArray.json"; // Atualize o caminho do arquivo JSON conforme necessário
console.log("Caminho absoluto do arquivo JSON:", path.resolve(jsonFilePath));

loadDataFromFile(jsonFilePath)
  .then((dataArray) => createQRCodePDF(dataArray))
  .catch((err) => console.error("Erro ao carregar dados do arquivo:", err));
