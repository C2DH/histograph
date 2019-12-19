FROM c2dhunilu/c2dh_nerd

WORKDIR /hg-resource-creator

RUN apt-get install -y protobuf-compiler libprotobuf-dev
RUN pip install cython

COPY ./requirements.txt .
RUN pip install -r ./requirements.txt

RUN python -m spacy download en_core_web_sm
RUN python -m spacy download xx_ent_wiki_sm

COPY . .

ENV PYTHONPATH /hg-resource-creator
