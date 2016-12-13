import os
import string
from subprocess import *
from sys import argv
import re

def main(file_path1, file_path2):

    # TODO: make objects instead of awful lists for everything

    linux_diff = run(["diff",file_path1,file_path2], stdout=PIPE).stdout.decode('utf-8')
    # print(linux_diff)

    # get acd and line nums
    acd_list = []
    f1_lines_list = []
    f2_lines_list = []

    # get diff's lines that tell changed line numbers
        # looks like this [##],##(a|c|d)##,[##] e.g. 29a32,34
    all_ch_descripts = re.findall('((?:[0-9]*,)?[0-9]+[acd][0-9]+(?:,[0-9]*)?)', linux_diff)

    for ch_descript in all_ch_descripts:
        print(ch_descript)
        # print()
        acd = re.search('[acd]',ch_descript).group(0)
        f1_linenum_s = re.search('((?:[0-9]+,)?[0-9]+)[acd]',ch_descript).group(1)
        f2_linenum_s = re.search('[acd]([0-9]+(?:,[0-9]+)?)',ch_descript).group(1)
        print('acd: ',acd)
        # print('f1_linenum_s: ',f1_linenum_s)
        # print('f2_linenum_s: ',f2_linenum_s)
        # print()
        f1_linenum_n = []
        f2_linenum_n = []
        for x in f1_linenum_s.split(','):
            f1_linenum_n.insert(len(f1_linenum_n),int(x))
        for y in f2_linenum_s.split(','):
            f2_linenum_n.insert(len(f2_linenum_n),int(y))
        # print('f1_linenum_n: ',f1_linenum_n)
        # print('f2_linenum_n: ',f2_linenum_n)
        # print()
        acd_list.insert(len(acd_list),acd)
        f1_lines_list.insert(len(f1_lines_list),f1_linenum_n)
        f2_lines_list.insert(len(f2_lines_list),f2_linenum_n)
        print('len(acd_list): ',len(acd_list))
        print('acd_list: ',acd_list)
        # print('f1_lines_list: ',f1_lines_list)
        # print('f2_lines_list: ',f2_lines_list)
        print('\n')

    # get og files' txt blocks
    file1 = open(file_path1).readlines()
    file2 = open(file_path2).readlines()

    f1_ch_blocks =[]
    f2_ch_blocks =[]
    print(len(f1_ch_blocks))
    print(len(f2_ch_blocks))

    # make incomplete txt blocks
    for i in range(len(acd_list)):
        curr_block = []
        print('--',acd_list[i],'--')
        # print file 1 lines
        if acd_list[i] == 'c' or acd_list[i] == 'd':
            # add lines into fx_ch_blocks
            curr_block.insert(0,(acd_list[i],f1_lines_list[i]))

            if len(f1_lines_list[i]) == 1:
                j = f1_lines_list[i][0]
                curr_block.insert(len(curr_block),acd_list[i]+' < '+file1[j-1])
                print('og f1',j, ' -',file1[j-1],end='')

            elif len(f1_lines_list[i]) > 1:
                for j in range(f1_lines_list[i][0],f1_lines_list[i][1]):
                    curr_block.insert(len(curr_block),acd_list[i]+' < '+file1[j-1])
                    print('og f1', j, ' -', file1[j-1],end='')

            # put txt block in its block list and then empty curr_block
            f1_ch_blocks.insert(len(f1_ch_blocks),curr_block)
            curr_block = []

        if acd_list[i] == 'c':
            print('   -')
        # print file 2 lines
        if acd_list[i] == 'c' or acd_list[i] == 'a':
            curr_block.insert(0,(acd_list[i],f2_lines_list[i]))

            if len(f2_lines_list[i]) == 1:
                j = f2_lines_list[i][0]
                curr_block.insert(len(curr_block),acd_list[i]+' > '+file2[j-1])
                print('og f2',j, ' -',file2[j-1],end='')

            elif len(f2_lines_list[i]) > 1:
                for j in range(f2_lines_list[i][0],f2_lines_list[i][1]):
                    curr_block.insert(len(curr_block),acd_list[i]+' > '+file2[j-1])
                    print('og f2', j, ' -', file2[j-1],end='')

            # put txt block in its block list and then empty curr_block
            f2_ch_blocks.insert(len(f2_ch_blocks),curr_block)
            curr_block = []


    print('------------------file1')
    complete_blocks(f1_ch_blocks,file1)
    print('------------------file2')
    complete_blocks(f2_ch_blocks,file2)

def complete_blocks(blocks, oboFile):
    for block in blocks:
        first_line_indx = block[0][1][0]
        last_line_indx = block[0][1][len(block[0][1])-1]
        while block[1].strip() != '[Term]':
            block.insert(1,'    '+oboFile[first_line_indx])
            first_line_indx -= 1
        while oboFile[last_line_indx+1].strip() != '':
            block.append('    '+oboFile[last_line_indx])
            last_line_indx += 1

        print(block[0])
        for x in range(1,len(block)):
            print(block[x],end='')
        print()



    





    # match diffs with their blocks in their original thing using regex





    # get acd
    # switch(acd)
    #     case a:
    #         get f2start, f2end
    #         get f2[f2start,f2end] as smoltxt
    #         if smoltxt != blockstartline
    #             get b'blockstartline s,oltxt .* \n\n'
    #         else
    #             get 'smoltxt .* \n\n'






if __name__ == "__main__":
    main(argv[1], argv[2])