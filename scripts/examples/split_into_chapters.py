# Python 3 required
import sys, re
import datetime

'''
Split 'War and Peace' book into chapters using the year of every book section
as a baseline date for timestamps of the chapters.
'''

file_name = sys.argv[1]
output_directory = sys.argv[2]

CHAPTER_PATTERN = r'^CHAPTER\s+\w+$'
APPENDIX_PATTERN = r'^\s*End of the Project Gutenberg EBook .*$'
BOOK_PATTERN = r'^BOOK\s(\w+):\s(\d+).*$'
EPILOGUE_PATTERN = r'^(\w+)\sEPILOGUE.*$'

date = datetime.datetime(1805, 1, 1)

book_title = ''

def normalise_chapter_label(line):
  return line.strip().replace(' ', '_').replace('\n', '')

with open(file_name, encoding='utf-8', mode='r') as f:
  chapter_accumulator = []
  chapter_title = 'WAR AND PEACE'

  for line in f.readlines():
    book_match = re.match(BOOK_PATTERN, line)
    epilogue_match = re.match(EPILOGUE_PATTERN, line)

    if book_match:
      book_title = book_match.group(1)
      year =  book_match.group(2)
      date = datetime.datetime(int(year), 1, 1)

    elif epilogue_match:
      epilogue = epilogue_match.group(1)
      book_title = f'EPILOGUE_{epilogue}'

    elif re.match(CHAPTER_PATTERN, line) or re.match(APPENDIX_PATTERN, line):
      title = normalise_chapter_label(chapter_title)
      chapter_filename = f'{output_directory}/{date.isoformat()}_title_book_{book_title}_{title}.txt'

      with open(chapter_filename, encoding='utf-8', mode='w') as of:
        of.writelines(chapter_accumulator)

      chapter_title = line
      chapter_accumulator = []
      date += datetime.timedelta(days = 30) 
    else:
      chapter_accumulator.append(line.strip() + ' ')
