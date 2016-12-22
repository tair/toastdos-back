import os
import string
# from subprocess import *
import subprocess
from sys import argv
import re

class OboChange:

    def __init__(self, f1, f2, f1_linenum, descriptor, f2_linenum):
        if not re.match('[acd]',descriptor):
            print("descriptor: ",descriptor)
            print("desc length: ", len(self.desc))
            raise NameError("descriptor is expected to be an 'a', 'c', or 'd' char")

        self.changes_s1 = f1_linenum[0]
        self.desc = descriptor.strip()
        self.changes_s2 = f2_linenum[0]
        self.changedTerms = {}
        self.deletedTerms = {}
        if len(f1_linenum) > 1:
            self.changes_e1 = f1_linenum[1]
        else:
            self.changes_e1 = self.changes_s1
        if len(f2_linenum) > 1:
            self.changes_e2 = f2_linenum[1]
        else:
            self.changes_e2 = self.changes_s2


        if descriptor == 'd':
            self.setDeletedTerms(f1)
        self.setChangedTerms(f2)



    def setChangedTerms(self, file_txt):
        upperBound = self.changes_s2 - 1
        lowerBound = self.changes_e2 - 1

        # get upper and lower bounds of changed area
        while file_txt[upperBound].strip() != "[Term]" and file_txt[upperBound].strip() != '':
            upperBound -= 1
        while file_txt[lowerBound].strip() != '':
            lowerBound += 1

        # get oboTerms from file_txt
        oboTerm = ""
        oboTermID = None

        for i in range(upperBound, lowerBound + 1):
            if not oboTermID:
                if file_txt[i] == '':
                    continue
                regex_search = re.search("id: (.+)(?:\n)?",file_txt[i])
                if regex_search:
                    oboTermID = regex_search.group(1)
            elif file_txt[i].strip() == '':
                if oboTermID in self.deletedTerms:
                    del(self.deletedTerms[oboTermID])
                self.changedTerms[oboTermID] = oboTerm
                oboTerm = ''
                oboTermID = None
                continue
            oboTerm += file_txt[i]



    def setDeletedTerms(self, file_txt):
        upperBound = self.changes_s1 - 1
        lowerBound = self.changes_e1 - 1

        # get upper and lower bounds of changed area
        while file_txt[upperBound].strip() != "[Term]" and file_txt[upperBound].strip() != '':
            upperBound -= 1
        while file_txt[lowerBound].strip() != '':
            lowerBound += 1

        # get oboTerms from file_txt
        oboTerm = ""
        oboTermID = None

        for i in range(upperBound, lowerBound + 1):
            if not oboTermID:
                if file_txt[i] == '':
                    continue
                regex_search = re.search("id: (.+)(?:\n)?",file_txt[i])
                if regex_search:
                    oboTermID = regex_search.group(1)
            elif file_txt[i].strip() == '':
                self.deletedTerms[oboTermID] = oboTerm
                oboTerm = ''
                oboTermID = None
                continue
            oboTerm += file_txt[i]








def main(file_path1, file_path2):

    process = subprocess.Popen(["diff",file_path1,file_path2], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    linux_diff = process.stdout.read().decode("utf-8")

    # get the changes found in the diff
    list_OboChanges = []
    list_DeletedIDs = []

    # get og files' txt blocks
    file1 = open(file_path1).readlines()
    file2 = open(file_path2).readlines()

    # get diff's changes' descriptions
        # looks like this [##],##(a|c|d)##,[##] e.g. 29a32,34
    all_ch_descripts = re.findall('((?:[0-9]*,)?[0-9]+[acd][0-9]+(?:,[0-9]*)?)', linux_diff)

    # take change descriptions' descriptor (add, change, del) and the changes'
    #   line numbers
    for ch_descript in all_ch_descripts:
        acd = re.search('[acd]',ch_descript).group(0)
        f1_linenum_s = re.search('((?:[0-9]+,)?[0-9]+)[acd]',ch_descript).group(1)
        f2_linenum_s = re.search('[acd]([0-9]+(?:,[0-9]+)?)',ch_descript).group(1)
        f1_linenum_n = [int(x) for x in f1_linenum_s.split(',')]
        f2_linenum_n = [int(y) for y in f2_linenum_s.split(',')]
        # for x in f1_linenum_s.split(','):
        #     f1_linenum_n.insert(len(f1_linenum_n),int(x))
        # for y in f2_linenum_s.split(','):
        #     f2_linenum_n.insert(len(f2_linenum_n),int(y))
        change = OboChange(file1, file2, f1_linenum_n, acd, f2_linenum_n)
        list_OboChanges.append(change)

    # get IDs of deleted terms in a list and print changed terms
    for change in list_OboChanges:
        for deletionID in change.deletedTerms:
            list_DeletedIDs.append(deletionID)
        for term in change.changedTerms.items():
            print(term[1])

    # print IDs of deleted terms
    if len(list_DeletedIDs) > 0:
        print("-------- entirely deleted terms' IDs --------")
        for deletionID in list_DeletedIDs:
            print(deletionID)


if __name__ == "__main__":
    main(argv[1], argv[2])