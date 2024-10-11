FROM python:3.12
WORKDIR /usr/src/nexas

### 1. node 16
RUN apt-get update && \
    apt-get install -y curl gnupg build-essential && \
    curl --silent --location https://deb.nodesource.com/setup_16.x | bash - && \
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get remove -y --purge cmdtest && \
    apt-get update && \
    apt-get install -y nodejs yarn && \
    # remove useless files from the current layer
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /var/lib/apt/lists.d/* && \
    apt-get autoremove && \
    apt-get clean && \
    apt-get autoclean

### 2. install app
COPY ./src ./src
COPY ./input ./input
COPY ./data ./data
WORKDIR /usr/src/nexas/src
RUN pip install -r ./requirements.txt 
RUN npm install pm2 -g
RUN npm install 

EXPOSE 3000
CMD ["pm2-runtime", "start", "node server.js --name nexas --log nexas.log"]
