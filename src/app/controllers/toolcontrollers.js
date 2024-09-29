const fs = require('fs');
const axios = require('axios');
const WebSocket = require('ws');
const ExcelJS = require('exceljs'); 
const wss = new WebSocket.Server({ port: 8081 });

let isScanning = false;
let totalPaths = 0; 

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

    static resultsPerPage = 10;

    /////

    async performScan(req, res) {
        isScanning = true;
    
        const baseUrl = req.body.baseUrl;
        const wordlistFilePath = req.file.path;
        const threatLevel = parseInt(req.body.threatLevel, 10) || 10;
    
        try {
            const fileContent = fs.readFileSync(wordlistFilePath, 'utf-8');
            const paths = fileContent.split('\n').map(path => path.trim()).filter(Boolean);
            totalPaths = paths.length;
    
            const results = [];
    
            for (let i = 0; i < paths.length; i++) {
                if (!isScanning) {
                    break;
                }
    
                const path = paths[i];
                const fullUrl = `${baseUrl}/${path}`;
                try {
                    const response = await axios.get(fullUrl, {
                        headers: {
                            'Connection': 'keep-alive',
                        },
                    });
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
                const row = worksheet.addRow(result);
        
                // Thiết lập màu nền cho ô Status
                if (result.status === 200) {
                    row.getCell('status').fill = {
                        // Màu nền xanh cho trạng thái 200
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF28A745' } // Màu xanh
                    };
                } else {
                    row.getCell('status').fill = {
                        // Màu nền đỏ cho các trạng thái lỗi
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFDC3545' } // Màu đỏ
                    };
                }
            });
        
            const excelFilePath = `uploads/scan_results_${Date.now()}.xlsx`; 
            await workbook.xlsx.writeFile(excelFilePath);
    
            // Xóa file wordlist sau khi quét xong
            fs.unlinkSync(wordlistFilePath);
    
            // Lưu đường dẫn file vào session
            req.session.excelFilePath = excelFilePath; 
            req.session.results = results; 
    
            // Phân trang kết quả
            const page = parseInt(req.query.page) || 1;
            const pageSize = ToolController.resultsPerPage;
            const totalPages = Math.ceil(results.length / pageSize);
            const paginatedResults = results.slice((page - 1) * pageSize, page * pageSize);
    
            // Render kết quả và cung cấp đường dẫn tải file
            res.render('tools/results', { results: paginatedResults, totalPages, currentPage: page, excelFilePath: excelFilePath });
        } catch (error) {
            console.error(error);
            res.status(500).send('An error occurred during the scan.');
        } finally {
            isScanning = false;
        }
    }
    
    
    

    async stop(req, res, next) {
        try {
            isScanning = false; 
            res.send({ message: 'Scan stopped' });
        } catch (error) {
            next(error);
        }
    }

    async getScanResults(req, res) {
        try {
            const results = req.session.results || [];
            const page = parseInt(req.query.page) || 1;
            const pageSize = ToolController.resultsPerPage; 
            const totalPages = Math.ceil(results.length / pageSize);
            const paginatedResults = results.slice((page - 1) * pageSize, page * pageSize);
            
            // Thêm biến excelFilePath
            const excelFilePath = req.session.excelFilePath; // Lấy từ session nếu đã được lưu
    
            res.render('tools/results', { 
                results: paginatedResults, 
                excelFilePath, // Gửi biến vào view
                totalPages, 
                currentPage: page 
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('An error occurred while fetching results.');
        }
    }

    //excel
    async excel(req, res, next) {
        const excelFilePath = req.session.excelFilePath; // Lấy đường dẫn file từ session
    if (excelFilePath) {
        res.download(excelFilePath, 'scan_results.xlsx', (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).send('Error downloading file.');
            }
            // Xóa đường dẫn file trong session nếu không còn cần thiết
            delete req.session.excelFilePath;
        });
    } else {
        res.status(404).send('File not found.');
    }
    }
}

module.exports = new ToolController();
