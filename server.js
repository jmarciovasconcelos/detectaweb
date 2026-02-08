/* ================================================================================
ATENÇÃO - INSTRUÇÕES DE INSTALAÇÃO E CUIDADOS (LEIA ANTES DE ALTERAR)
================================================================================
PROJETO: Web Server Single-File para Acesso à Webcam
ARQUIVO ÚNICO: server.js
PORTA: 8000

INSTRUÇÕES DE INSTALAÇÃO NO EASYPANEL:
1. Crie o serviço (App).
2. No 'Source', coloque apenas este arquivo.
3. Nas configurações (Settings):
   - Build Pack: Pode deixar automático ou selecionar Node.js.
   - Start Command (se precisar): node server.js
   - Port: 8000
4. HTTPS é OBRIGATÓRIO: O EasyPanel deve fornecer o SSL (cadeado), senão
   o navegador bloqueia a webcam por segurança.

CUIDADOS PARA OUTRAS IAs E DESENVOLVEDORES:
1. Este código usa ZERO dependências externas. Não adicione 'require(express)'
   a menos que vá criar o package.json.
2. O HTML está embutido na variável 'htmlContent'. Cuidado ao editar a string
   para não quebrar a sintaxe do template string (crase `).
3. O CSS e JS estão embutidos no HTML para manter o arquivo único.
4. Mantenha os headers de segurança e o Healthcheck (/health) para o EasyPanel
   não matar o processo.
================================================================================
*/


const http = require('http');

// Porta definida pelo ambiente ou 8000 fixa
const PORT = process.env.PORT || 8000;

// Conteúdo HTML/CSS/JS embutido
const htmlContent = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acesso Webcam - Cliente</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #121212;
            color: #e0e0e0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
        }
        .container {
            background-color: #1e1e1e;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            text-align: center;
            width: 90%;
            max-width: 720px;
            border: 1px solid #333;
        }
        h1 { margin-bottom: 20px; font-size: 1.5rem; color: #fff; }
        .video-wrapper {
            width: 100%;
            background: #000;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            aspect-ratio: 16/9;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #333;
        }
        video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: scaleX(-1);
        }
        .status {
            margin-top: 20px;
            padding: 12px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 0.95rem;
        }
        .status.loading { background-color: #0277bd; color: white; }
        .status.success { background-color: #2e7d32; color: white; }
        .status.error { background-color: #c62828; color: white; }
        #retryBtn {
            margin-top: 15px;
            padding: 10px 20px;
            background-color: #444;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: none;
        }
        #retryBtn:hover { background-color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Monitoramento de Webcam</h1>
        <div class="video-wrapper">
            <video id="webcam" autoplay playsinline muted></video>
        </div>
        <div id="statusMessage" class="status loading">
            Inicializando câmera...
        </div>
        <button id="retryBtn" onclick="startWebcam()">Tentar Novamente</button>
    </div>
    <script>
        const videoElement = document.getElementById('webcam');
        const statusElement = document.getElementById('statusMessage');
        const retryBtn = document.getElementById('retryBtn');

        async function startWebcam() {
            statusElement.className = "status loading";
            statusElement.textContent = "Solicitando permissão da câmera...";
            retryBtn.style.display = "none";
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: "user"
                    }, 
                    audio: false 
                });
                videoElement.srcObject = stream;
                statusElement.textContent = "Câmera conectada com sucesso.";
                statusElement.className = "status success";
            } catch (error) {
                console.error("Erro na webcam:", error);
                let msg = "Erro desconhecido.";
                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    msg = "Acesso negado! Você precisa clicar em 'Permitir' no navegador.";
                } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                    msg = "Nenhuma webcam detectada.";
                } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                    msg = "A câmera já está sendo usada por outro aplicativo.";
                } else if (window.isSecureContext === false) {
                    msg = "Erro de Segurança: O navegador bloqueou a câmera porque o site não está usando HTTPS.";
                } else {
                    msg = "Falha ao abrir câmera: " + error.message;
                }
                statusElement.textContent = msg;
                statusElement.className = "status error";
                retryBtn.style.display = "inline-block";
            }
        }
        window.addEventListener('load', startWebcam);
    </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
    // Log limpo sem caracteres de escape extras
    console.log(`[Request] ${req.method} ${req.url}`);

    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
        return;
    }

    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
});

server.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`SERVIDOR ONLINE (Single File Node)`);
    console.log(`Porta: ${PORT}`);
    console.log(`URL Local: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});