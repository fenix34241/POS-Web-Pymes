# Usamos una imagen de Node.js ligera
FROM node:18-alpine

# Carpeta donde vivirá el código dentro de Docker
WORKDIR /app

# Copiamos los archivos de configuración primero
COPY package*.json ./

# Instalamos las librerías
RUN npm install

# Copiamos el resto de tu código (src, index.html, etc.)
COPY . .

# Exponemos el puerto que usa Vite (por defecto 5173)
EXPOSE 5173

# Comando para arrancar el modo desarrollo
CMD ["npm", "run", "dev", "--", "--host"]