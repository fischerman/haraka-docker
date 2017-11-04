FROM node:6.11.5

EXPOSE 587

RUN npm install -g Haraka@2.8.16 
RUN haraka -i /haraka

CMD ["haraka", "-c", "/haraka"]