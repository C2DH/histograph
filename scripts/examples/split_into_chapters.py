import sys, re
import datetime

file_name = sys.argv[1]
output_directory = sys.argv[2]

CHAPTER_PATTERN = r'^Chapter\s+\d+$'
APPENDIX_PATTERN = r'^End of the Project Gutenberg EBook .*$'

date = datetime.datetime(1900, 1, 1)

def normalise_chapter_label(line):
  return line.replace(' ', '_').replace('\n', '')

with open(file_name, encoding='utf-8', mode='r') as f:
  chapter_accumulator = []
  chapter_title = 'Preface'

  for line in f.readlines():
    if re.match(CHAPTER_PATTERN, line) or re.match(APPENDIX_PATTERN, line):
      title = normalise_chapter_label(chapter_title)
      chapter_filename = f'{output_directory}/{date.isoformat()}_title_{title}.txt'

      with open(chapter_filename, encoding='utf-8', mode='w') as of:
        of.writelines(chapter_accumulator)

      chapter_title = line
      chapter_accumulator = []
      date += datetime.timedelta(days = 30) 
    else:
      chapter_accumulator.append(line)