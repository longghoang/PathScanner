const fs = require('fs');
const axios = require('axios');
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('close', () => {
      console.log('Client disconnected');
  });
});

class ToolController {
    async scan(req, res,next) {
        try {
            res.render('tools/main');
        } catch (error) {
            next(error);
        }
    }

    async performScan(req, res) {
      const baseUrl = req.body.baseUrl; 
      const wordlistFilePath = req.file.path; 
  
      try {
          const fileContent = fs.readFileSync(wordlistFilePath, 'utf-8');
          const paths = fileContent.split('\n').map(path => path.trim()).filter(Boolean);
          const results = [];
          const totalPaths = paths.length;
  
          for (let i = 0; i < totalPaths; i++) {
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
                          status: 'Không nhận được phản hồi từ server',
                          length: 0
                      });
                  }
              }
  
              // Tính toán và gửi thông tin tiến trình
              const progress = Math.floor(((i + 1) / totalPaths) * 100);
              wss.clients.forEach(client => {
                  if (client.readyState === WebSocket.OPEN) {
                      client.send(JSON.stringify({ progress, totalPaths }));
                  }
              });
          }
  
          fs.unlinkSync(wordlistFilePath);
          res.render('tools/results', { results });
      } catch (error) {
          console.error(error);
          res.status(500).send('Có lỗi xảy ra khi quét.');
      }
  }
}

module.exports = new ToolController();
