import express from 'express';
import sprightly from 'sprightly';
import http from 'http';
import { Server } from 'socket.io';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import {
    existsSync,
    mkdirSync,
    readFileSync,
    rmSync
} from 'fs';
import { createRequire } from "module";
import { spawn } from 'child_process';

const require = createRequire(import.meta.url);
const upload = require('express-fileupload');
const path = require('path');

const dataDir = '../data/';

if (!existsSync(dataDir)) {
    mkdirSync(dataDir);
}

const app = express();
app.engine('spy', sprightly);
app.set('views', './frontend/views');
app.set('view engine', 'spy');
app.use(express.static('./frontend/public')); // serve the "public" directory
app.use(upload());

const title = "nexas";
const http_ = http.createServer(app);
const io = new Server(http_);
const PORT = process.env.PORT || 3000;

// client resources
app.get('/', (req, res) => {
    const uuid = req.query.id || uuidv4()
    res.render('main/welcome.spy', { title, uuid })
});

app.get('/extensions', async (req, res) => {
    const file_path = path.join(dataDir, req.query.example, "extensions.json");
    if (!existsSync(file_path)) {
        return res.send({ status: 'unavailable' });    
    }    
    const file = readFileSync(file_path);
    return res.json(JSON.parse(file));
});

app.get('/arguments', async (req, res) => {
    const file_path = path.join(dataDir, req.query.example, "arguments.json");
    if (!existsSync(file_path)) {
        return res.send({ status: 'unavailable' });    
    }    
    const file = readFileSync(file_path);
    return res.json(JSON.parse(file));
});

app.get('/correlation', async (req, res) => {
    const file_path = path.join(dataDir, req.query.example, "corrs.json");
    if (!existsSync(file_path)) {
        return res.send({ status: 'unavailable' });    
    }    
    const file = readFileSync(file_path);
    return res.json(JSON.parse(file));
});

app.get('/metadata', async (req, res) => {
    const file_path = path.join(dataDir, req.query.example, "metadata.json");
    if (!existsSync(file_path)) {
        return res.send({ status: 'unavailable' });    
    }    
    const file = readFileSync(file_path);
    return res.json(JSON.parse(file));
});

// restful api comms 
const backend = 'http:localhost:8050';

app.get('/query', async (req, res) => {
    const resource = req.query.resource;
    const response = await fetch(backend + '/' + resource, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
    });
    // TODO error handling
    const data = await response.json();

    return res.json(data);
});

app.get('/get', async (req, res) => {
    const id = req.query.id;

    return res.json(status[id]);
});

let status = { 

};

app.post('/create', (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const id = req.body.id;
    if (status[id] === 'busy') {
        res.send('already creating!');
    }
    status[id] = 'busy';
    console.log('received project request! processing...');
    
    const uploadsDir = path.join(dataDir, id);
    if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir);
    } else {
        rmSync(uploadsDir, { recursive: true, force: true });
        mkdirSync(uploadsDir);
        //console.log('project already exists!');
    }

    const file = req.files.file; // The name of the input field (i.e. "file") is used to retrieve the uploaded file
    const uploadPath = path.join(uploadsDir, file.name);

    file.mv(uploadPath, function (err) {
        if (err) {
            return res.status(500).send(err);
        }

        const process = spawn('python', [
            './server.py',
            '--apx', uploadPath,
            '--to', uploadsDir,
            '--n', req.body.n,
            '--sem', req.body.sem_a, req.body.sem_b,
            '--route', req.body.route,
        ], { encoding: 'utf-8' });

        printOutput(process, id)
    });
    res.send('processing');
});

function printOutput(p, id) {
    p.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    p.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    p.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        status[id] = 'ready';
        console.log(status)
    });
}


// init 
http_.listen(PORT, function () {
    console.log(`Server is listening on port http://localhost:${PORT}`);
});
