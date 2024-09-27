const fs = require('fs');
const axios = require('axios');
const WebSocket = require('ws');
const ExcelJS = require('exceljs'); // Import thư viện exceljs
const wss = new WebSocket.Server({ port: 8080 });

let isScanning = false;
let totalPaths = 0; // Số lượng đường dẫn trong wordlist

// WebSocket connection
wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

class ToolController {
    async scan(req, res, next) {
        try {
            res.render('tools/main');
        } catch (error) {
            next(error);
        }
    }

    async performScan(req, res) {
        isScanning = true; // Bắt đầu quét

        const baseUrl = req.body.baseUrl;
        const wordlistFilePath = req.file.path;
        const threatLevel = parseInt(req.body.threatLevel, 10) || 10;

        try {
            const fileContent = fs.readFileSync(wordlistFilePath, 'utf-8');
            const paths = fileContent.split('\n').map(path => path.trim()).filter(Boolean);
            totalPaths = paths.length; // Lưu tổng số đường dẫn

            const results = [];

            for (let i = 0; i < paths.length; i++) {
                if (!isScanning) {
                    break; // Dừng quét nếu yêu cầu dừng
                }

                const path = paths[i];
                const fullUrl = `${baseUrl}/${path}`;
                try {
                    const response = await axios.get(fullUrl);
                    results.push({
                        url: fullUrl,
                        status: response.status,
                        length: response.data.length
                    });
                } catch (error) {
                    if (error.response) {
                        results.push({
                            url: fullUrl,
                            status: error.response.status,
                            length: error.response.data.length
                        });
                    } else {
                        results.push({
                            url: fullUrl,
                            status: 'No response from server',
                            length: 0
                        });
                    }
                }

                // Gửi tiến trình đến client qua WebSocket
                const progress = Math.round(((i + 1) / totalPaths) * 100);
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ progress, totalPaths }));
                    }
                });

                await new Promise(resolve => setTimeout(resolve, 1000 / threatLevel));
            }

            // Xuất kết quả ra file Excel
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Scan Results');
            worksheet.columns = [
                { header: 'URL', key: 'url' },
                { header: 'Status', key: 'status' },
                { header: 'Length', key: 'length' }
            ];

            results.forEach(result => {
                worksheet.addRow(result);
            });

            const excelFilePath = 'scan_results.xlsx';
            await workbook.xlsx.writeFile(excelFilePath);

            
            fs.unlinkSync(wordlistFilePath);
            res.render('tools/results', { results, excelFilePath });
        } catch (error) {
            console.error(error);
            res.status(500).send('An error occurred during the scan.');
        } finally {
            isScanning = false; 
        }
    }
    
    // Stop
    async stop(req, res, next) {
        try {
            isScanning = false; 
            res.send({ message: 'Scan stopped' });
        } catch (error) {
            next(error);
        }
    }

    //xlsx
    
    async xlsx(req, res, next) {
      try {
        const file = `${__dirname}/scan_results.xlsx`;
        res.download(file); 
      } catch (error) {
          next(error);
      }
  }
}

module.exports = new ToolController();
