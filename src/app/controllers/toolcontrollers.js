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
      const threatLevel = parseInt(req.body.threatLevel, 10) || 10; 
      const totalPaths = fs.readFileSync(wordlistFilePath, 'utf-8').split('\n').length;
  
      try {
          const fileContent = fs.readFileSync(wordlistFilePath, 'utf-8');
          const paths = fileContent.split('\n').map(path => path.trim()).filter(Boolean);
          const results = [];
  
          for (let index = 0; index < paths.length; index++) {
              const path = paths[index];
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
                          status: 'No response from server, check your internet',
                          length: 0
                      });
                  }
              }
  
    
              const progress = Math.round(((index + 1) / totalPaths) * 100);
              wss.clients.forEach(client => {
                  if (client.readyState === WebSocket.OPEN) {
                      client.send(JSON.stringify({ progress, totalPaths }));
                  }
              });
  
              
              await new Promise(resolve => setTimeout(resolve, 1000 / threatLevel));
          }
  
          fs.unlinkSync(wordlistFilePath);
          res.render('tools/results', { results });
      } catch (error) {
          console.error(error);
          res.status(500).send('An error occurred during the scan.');
      }
  }
  

}

module.exports = new ToolController();
