FROM ubuntu:18.04
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

### 3. python 3.8 
RUN apt update && \
    apt install --no-install-recommends -y build-essential software-properties-common && \
    add-apt-repository -y ppa:deadsnakes/ppa && \
    apt install --no-install-recommends -y python3.8 python3.8-dev python3.8-distutils && \
    apt clean && rm -rf /var/lib/apt/lists/*
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.6 1
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.8 2
RUN curl -s https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
    python3 get-pip.py --force-reinstall && \
    rm get-pip.py

### 4. clingo
RUN python3 -m pip install --user --upgrade clingo

### 5. install app
COPY ./src ./src
COPY ./data ./data
WORKDIR /usr/src/nexas/src
RUN pip install -r ./requirements.txt 
RUN npm install pm2 -g
RUN npm install 

EXPOSE 3000
CMD ["pm2-runtime", "start", "node server.js --name nexas --log nexas.log"]
