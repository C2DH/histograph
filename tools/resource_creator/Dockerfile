FROM pytorch/pytorch:1.2-cuda10.0-cudnn7-devel

RUN apt-get update && apt-get install -y unixodbc-dev gcc g++ protobuf-compiler libprotobuf-dev --no-install-recommends

WORKDIR /hg-resource-creator

RUN pip install cython
COPY ./requirements.txt .
RUN pip install -r ./requirements.txt

RUN apt-get purge -y --auto-remove unixodbc-dev gcc g++ libprotobuf-dev
RUN rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade https://github.com/C2DH/c2dh_nerd/archive/master.zip#egg=c2dh_nerd
RUN python -m spacy download en_core_web_sm
RUN python -m spacy download xx_ent_wiki_sm

COPY . .

ENV PYTHONPATH /hg-resource-creator
