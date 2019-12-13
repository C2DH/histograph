FROM python:3.6-alpine

RUN apk add --no-cache unixodbc-dev gcc g++ protobuf-compiler libprotobuf-dev

WORKDIR /hg-resource-creator

RUN pip install cython
COPY ./requirements.txt .
RUN pip install -r ./requirements.txt

RUN apk remove gcc g++

RUN pip install --upgrade https://github.com/C2DH/c2dh_nerd/archive/master.zip#egg=c2dh_nerd
RUN python -m spacy download en_core_web_sm
RUN python -m spacy download xx_ent_wiki_sm

COPY . .

ENV PYTHONPATH /hg-resource-creator
