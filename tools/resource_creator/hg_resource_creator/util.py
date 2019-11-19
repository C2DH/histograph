import os
import resource

def get_files(path):
  for r, _, f in os.walk(path):
    for file in sorted(f):
      p = os.path.join(r, file)
      yield p

def get_mem_info():
  rss_self = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
  rss_children = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss / 1024
  rss = rss_self + rss_children

  return f'Total Mem usage {rss}. Self: {rss_self}. Children: {rss_children}'

def get_file_content(filename):
  with open(filename, mode='r', encoding='utf-8', errors='ignore') as file:
    return file.read()
