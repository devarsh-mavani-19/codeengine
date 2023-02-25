FROM node:15
# create users 

RUN for i in $(seq 1001 1500); do \
	echo $i; \
        groupadd -g $i runner$i && \
        useradd -M runner$i -g $i -u $i ; \
    done

WORKDIR /app
RUN dpkg-reconfigure -p critical dash

RUN apt-get update && \
    apt-get install -y libseccomp-dev

# packages part
ADD ./packages ./packages
RUN chmod 755 -R ./packages
# COPY ./install_packages.sh .
# RUN chmod 777 install_packages.sh
# RUN ./install_packages.sh

COPY package.json ./
ARG NODE_ENV
RUN if [ "$NODE_ENV" = "development" ]; \
        then npm install; \
        else npm install --only=production; \
        fi
COPY ./CodeExecutionEngine ./CodeExecutionEngine
RUN pwd
RUN whoami
RUN ls ./CodeExecutionEngine/src/nosocket
RUN make -C ./CodeExecutionEngine/src/nosocket/ all && make -C ./CodeExecutionEngine/src/nosocket/ install
# CMD ["node", "CodeExecutionEngine/src/index.js"]
