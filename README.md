# nexas
For more information, please visit: https://imld.de/en/research/research-projects/nexas/

## how to use: 

### docker: 
```
docker build . -t <your username>/nexas
docker run -dp 7007:3000 <your username>/nexas:latest
```

after installation, nexas will be accessible at: https://localhost:7007 with a sample dataset (long-island-railroad_20090825_0512.gml.20.apx)

### local installation: 
(backend) console:
```
nexas $ python venv venv
nexas $ source venv/bin/activate
(venv) nexas $ cd src
(venv) src $ pip install -r requirements.txt
(venv) src $ python server.py --apx "./../input/massachusetts_srta_2014-11-13.gml.50.apx" --to "./public/data/123/" --n 10000 --sem "cf2" "stable" --route ""
```

(frontend) console:
```
nexas $ cd src 
src $ npm install 
src $ npm start 
```
(browser) http://localhost:3000/
