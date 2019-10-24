#!/bin/sh

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout server.key -out server.crt

# openssl genrsa -des3 -out server.key 2048
# openssl req -new -key server.key -out server.csr
# openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt