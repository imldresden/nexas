# nexas
For more information, please visit: https://imld.de/en/research/research-projects/nexas/

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
