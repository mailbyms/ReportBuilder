# 后端 Dockerfile
FROM node:20
WORKDIR /app

COPY ./ ./

# 安装后端依赖，包括 playwright
RUN npm install --registry=https://registry.npmmirror.com 

EXPOSE 3000

# 容器启动命令
CMD ["node", "server.js"]