import os
import string
import subprocess
from sys import argv
import re

# get change command from the original diff file and get terms and IDs from it
def setChangedTerms(ch_comm):

    # global fields
    global dict_changedTerms
    global file1
    global file2

    acd = re.search('[acd]',ch_comm).group(0)
    f1_lines = re.search('((?:[0-9]+,)?[0-9]+)[acd]',ch_comm).group(1)
    f2_lines = re.search('[acd]([0-9]+(?:,[0-9]+)?)',ch_comm).group(1)
    f1_lines = [int(x) for x in f1_lines.split(',')]
    f2_lines = [int(y) for y in f2_lines.split(',')]

    # get term IDs of file1 whose pertinent diff was a 'change' or 'delete'
    if re.match("[cd]",acd):
        # find first and last lines of changed terms in file1
        start_line = f1_lines[0]
        end_line = f1_lines[-1]

        while file1[start_line].strip() not in ("[Term]",''):
            start_line -= 1
        while file1[end_line].strip() != '':
            end_line += 1

        # put term IDs in dict_changedTerms as keys if not already there
        for i in range(start_line, end_line):
            regex_match = re.match("id: (.+)(?:\n)?",file1[i])
            if regex_match:
                if regex_match.group(1) not in dict_changedTerms:
                    dict_changedTerms[regex_match.group(1)] = None

    # get terms and IDs of file2 
    # find first and last lines of changed terms in file2
    start_line = f2_lines[0]
    end_line = f2_lines[-1]

    while file2[start_line].strip() not in ("[Term]",''):
        start_line -= 1
    while file2[end_line].strip() != '':
        end_line += 1

    # put terms as values in dict_changedTerms and their ID as key
    oboTerm = ""
    oboTermID = None
    for i in range(start_line, end_line):
        if file2[i] == '' or i == end_line-1:
            if oboTerm != "" and oboTermID != None:
                dict_changedTerms[oboTermID] = oboTerm
                oboTerm = ''
                oboTermID = None
        else:
            oboTerm += file2[i]
            # check for oboTermID
            temp_termID = re.match("id: (.+)(?:\n)?",file2[i])
            if temp_termID:
                oboTermID = temp_termID.group(1)



def main(filepath1, filepath2):

    # set up global fields
    global dict_changedTerms
    global file1
    global file2
    dict_changedTerms = {}
    file1 = open(filepath1).readlines()
    file2 = open(filepath2).readlines()

    # run the linux diff tool on the given files and capture the output
    process = subprocess.Popen(["diff",filepath1,filepath2], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    og_diff = process.stdout.readlines()

    # identify change commands in diff and pass them to 
    for line in og_diff:
        if re.match("[0-9]",line.decode("utf-8")[0]):
            setChangedTerms(line.decode("utf-8"))

    # write file2's header and the changed terms to changedTerms.obo
    # and write list deleted terms' IDs to deletedTermIDs
    file_changedTerms = open('changedTerms.obo', 'w')
    file_deletedTermIDs = open('deletedTermIDs', 'w')

    for line in file2:
        if line.strip() != '':
            file_changedTerms.write(line)
        else:
            file_changedTerms.write("\n")
            break

    for ID_key in dict_changedTerms:
        if dict_changedTerms[ID_key]:
            file_changedTerms.write(dict_changedTerms[ID_key])
            file_changedTerms.write("\n")
        else:
            file_deletedTermIDs.write(ID_key)
            file_deletedTermIDs.write("\n")

    print("done")



if __name__ == "__main__":
    main(argv[1], argv[2])