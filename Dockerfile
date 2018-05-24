FROM node:6.11.5

EXPOSE 25 587

RUN npm install -g Haraka@2.8.18 sqlite3
RUN haraka -i /haraka

CMD ["haraka", "-c", "/haraka"]