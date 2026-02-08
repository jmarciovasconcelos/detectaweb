const http = require('http');

// CORREÇÃO: Forçamos a porta 8000 e ignoramos a variável de ambiente
// para garantir que bata com a configuração do EasyPanel
const PORT = 8000; 

const htmlContent = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reconhecimento Facial - Escolar</title>
    <script src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #121212;
            color: #e0e0e0;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
            margin: 0;
        }

        .controls {
            margin-top: 20px;
            background: #1e1e1e;
            padding: 20px;
            border-radius: 8px;
            display: flex;
            gap: 10px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            flex-wrap: wrap;
            justify-content: center;
            z-index: 10;
        }

        input {
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #333;
            background: #2c2c2c;
            color: white;
        }

        button {
            padding: 10px 20px;
            background-color: #2e7d32;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }

        button:disabled {
            background-color: #555;
            cursor: not-allowed;
        }

        button:hover:not(:disabled) {
            background-color: #1b5e20;
        }

        .video-container {
            position: relative;
            margin-top: 20px;
            width: 720px;
            height: 560px;
            background: #000;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
            border: 2px solid #333;
        }

        video {
            position: absolute;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        canvas {
            position: absolute;
            top: 0;
            left: 0;
        }

        .status {
            margin-top: 10px;
            font-size: 0.9rem;
            color: #bbb;
        }
        
        .loading-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 1.5rem;
            z-index: 20;
            flex-direction: column;
            text-align: center;
        }
    </style>
</head>
<body>

    <div class="controls">
        <input type="text" id="studentName" placeholder="Nome do Aluno">
        <input type="text" id="studentCode" placeholder="Código (Ex: 123)">
        <button id="btnRegister" onclick="registerStudent()" disabled>Cadastrar Aluno</button>
    </div>

    <div class="status" id="statusMsg">Aguardando carregamento da IA...</div>

    <div class="video-container">
        <div id="loadingOverlay" class="loading-overlay">
            Carregando IA...<br>
            <span style="font-size: 0.9rem; margin-top: 10px;">(Aguarde, baixando modelos)</span>
        </div>
        <video id="video" autoplay muted playsinline></video>
    </div>

    <script>
        const video = document.getElementById('video');
        const btnRegister = document.getElementById('btnRegister');
        const statusMsg = document.getElementById('statusMsg');
        const loadingOverlay = document.getElementById('loadingOverlay');

        let labeledDescriptors = [];
        
        // Carrega modelos
        async function loadModels() {
            // Usando CDN pública estável para os modelos
            const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
            
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
                ]);
                startVideo();
            } catch (err) {
                console.error("Erro Models:", err);
                statusMsg.innerText = "Erro ao baixar modelos de IA.";
            }
        }

        async function startVideo() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
                video.srcObject = stream;
            } catch (err) {
                console.error(err);
                statusMsg.innerText = "Sem permissão de câmera (Use HTTPS!)";
            }
        }

        video.addEventListener('play', () => {
            loadingOverlay.style.display = 'none';
            statusMsg.innerText = "Sistema Pronto.";
            btnRegister.disabled = false;

            const canvas = faceapi.createCanvasFromMedia(video);
            document.querySelector('.video-container').append(canvas);
            
            const displaySize = { width: video.clientWidth, height: video.clientHeight };
            faceapi.matchDimensions(canvas, displaySize);

            setInterval(async () => {
                const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

                if (labeledDescriptors.length === 0) {
                    faceapi.draw.drawDetections(canvas, resizedDetections);
                    return;
                }

                const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
                const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));

                results.forEach((result, i) => {
                    const box = resizedDetections[i].detection.box;
                    const { label } = result;
                    let text = label === 'unknown' ? "Desconhecido" : label;
                    new faceapi.draw.DrawBox(box, { label: text }).draw(canvas);
                });
            }, 100);
        });

        async function registerStudent() {
            const name = document.getElementById('studentName').value;
            const code = document.getElementById('studentCode').value;

            if (!name || !code) return alert("Preencha todos os campos!");

            btnRegister.innerText = "Lendo rosto...";
            btnRegister.disabled = true;

            // Usa SSD MobileNet para cadastro (mais preciso)
            const detection = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(
                    \`\${name} - \${code}\`,
                    [detection.descriptor]
                ));
                alert("Cadastrado com sucesso!");
                document.getElementById('studentName').value = '';
                document.getElementById('studentCode').value = '';
            } else {
                alert("Rosto não detectado. Fique parado e ilumine o rosto.");
            }

            btnRegister.innerText = "Cadastrar Aluno";
            btnRegister.disabled = false;
        }

        loadModels();
    </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
    // Healthcheck para o EasyPanel não matar o app
    if (req.url === '/health') {
        res.writeHead(200);
        res.end('OK');
        return;
    }

    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);
        return;
    }

    res.writeHead(404);
    res.end('404');
});

server.listen(PORT, () => {
    console.log(`\n--- SERVIDOR ONLINE NA PORTA ${PORT} ---\n`);
});