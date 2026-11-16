# Base de datos

El kit habla el protocolo de MongoDB (con Mongoose). Eso te deja elegir entre
varias bases sin cambiar código: sólo cambia `MONGODB_URI`.

| Opción | Cuándo | Estado |
|---|---|---|
| **MongoDB Atlas** | Lo más simple. El plan gratuito aguanta un evento de cientos de personas | Usado en producción |
| **MongoDB propio** | Ya tienes un servidor | Usado en producción |
| **Amazon DocumentDB** | Quieres todo dentro de AWS | Preparado, falta probarlo en un evento real |
| **FerretDB sobre PostgreSQL** | Prefieres Postgres (RDS, Aurora, Supabase…) | Experimental |
| **En memoria** | Probar y desarrollar | `npm run demo` |

## MongoDB Atlas

Crea un clúster, un usuario con permiso de lectura y escritura sobre una sola
base, y limita el acceso por IP a tu servidor.

```
MONGODB_URI=mongodb+srv://usuario:clave@cluster.mongodb.net/mi-evento?retryWrites=true&w=majority
```

## Amazon DocumentDB

Crea el clúster en la misma VPC que tu servidor (no tiene acceso público),
descarga el certificado de AWS y apunta a él:

```
MONGODB_URI=mongodb://usuario:clave@mi-cluster.cluster-xxxx.us-east-1.docdb.amazonaws.com:27017/mi-evento?tls=true&replicaSet=rs0&readPreference=secondaryPreferred
MONGODB_CA_FILE=/ruta/global-bundle.pem
```

El kit detecta el dominio de DocumentDB y apaga `retryWrites`, que no soporta.

## PostgreSQL con FerretDB

[FerretDB](https://www.ferretdb.com) es un proxy que traduce el protocolo de
MongoDB a PostgreSQL. Lo levantas junto a tu Postgres y el kit se conecta a
FerretDB como si fuera MongoDB:

```
MONGODB_URI=mongodb://usuario:clave@localhost:27017/mi-evento
```

No está probado de punta a punta: si lo usas, corre un ensayo completo
(registro, check-in, campañas) antes del evento y cuéntanos en un issue.

## ¿Y DynamoDB?

No. El panel filtra, ordena y agrega sobre muchos campos a la vez (audiencias,
reportes, búsquedas), y eso en DynamoDB pide rediseñar los datos, no cambiar un
conector. Si quieres una base de AWS, es DocumentDB.

## Para desarrollar

```bash
npm run demo          # sitio + base en memoria + datos de ejemplo
npm run db:memoria    # sólo la base en memoria, para usarla con `npm run dev`
```

## La primera cuenta

Con la base vacía, crea la cuenta de administración una vez:

```bash
ADMIN_EMAIL=tu@correo ADMIN_NAME="Tu Nombre" ADMIN_PASSWORD='una-clave-larga' npm run crear-admin
```

Las demás se crean desde el panel, que le manda a cada persona un enlace para
elegir su contraseña.

## Copias de seguridad

Antes y después del evento, como mínimo. Atlas y DocumentDB tienen copias
automáticas: actívalas. Una copia tiene datos personales: guárdala cifrada,
fuera del repo, y bórrala cuando cumpla su propósito.
