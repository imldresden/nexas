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
```
To that it creates the files, you can run: 
```
(venv) src $ python server.py --apx "../input/massachusetts_srta_2014-11-13.gml.50.apx" --to "../data/<name>/" --n 10000 --sem "cf2" "stage" --route ""
```

(frontend) console:
```
nexas $ cd src 
src $ npm install 
src $ npm start 
```
(browser) `http://localhost:3000/`. 
To see the test data created in the last backend step, use `http://localhost:3000?id=<name>`. 
Otherwise, you can create a project from the sidebar, by clicking `New Project` at the bottom and providing the inputs in the modal. 