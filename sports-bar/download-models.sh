#!/bin/bash
set -e
cd "$(dirname "$0")/models"

dl() {
  local file="$1" url="$2"
  if [ -f "$file" ]; then echo "SKIP $file"; return; fi
  echo "GET  $file"
  curl -sL -o "$file" "$url" || echo "FAIL $file"
}

# === Cyberpunk Pack ===
dl "Arcade_Machine_Black.glb" "https://builder-items.decentraland.org/contents/bafybeigoag6eljiiszhrscgcuuemxiycmfkdym2fftrd5exghthfxjji4a"
dl "Arcade_Machine_Blue.glb" "https://builder-items.decentraland.org/contents/bafybeih4a3zqdy3u4karvd4e6jk5scu2blccjulqic2sioxgcft4e6ip6e"
dl "Arcade_Machine_Red.glb" "https://builder-items.decentraland.org/contents/bafybeiez6juqmkktpdblmbe4nxaw4nbfm4rw4pdfdofxiewtkqcyl6etja"
dl "Bar Stool.glb" "https://builder-items.decentraland.org/contents/bafkreifgd7m2pgmhzxtoohgw2sbubvsgtxqrlng6pkpqwkigoj3b5xsmi4"
dl "Boombox_01.glb" "https://builder-items.decentraland.org/contents/bafkreif4a3gcjil77tvrijmje647xjsb55qx7lls3zmw53c7ijyerldft4"
dl "Bottle_Sake.glb" "https://builder-items.decentraland.org/contents/bafybeifxcdm5olr7dqyg5gzvcgck2jmxp3f47ue7kd76fphmt6c7jlncr4"
dl "Cigarettes.glb" "https://builder-items.decentraland.org/contents/bafkreia4lcvezjpsljkrlyggn3dp5cf7hdqnsboajhc37f6z32rblpcgcm"
dl "Coffee_Table.glb" "https://builder-items.decentraland.org/contents/bafybeidri3zqez2pczaappv3wqkqyqdpjpcwzfoiqwsngst4zcynlfqyeq"
dl "Display_Monitor.glb" "https://builder-items.decentraland.org/contents/bafybeibmadwdyjkpd3l4eet2tda5rdo35i46w6hdbaqr2tqrplhfgrhrxm"
dl "Drinks_Dispenser_Black.glb" "https://builder-items.decentraland.org/contents/bafybeiaoggmdcxbrjatu5sfu6erlh5tup5vlawsykoyfr5p43camj5t3tu"
dl "Drinks_Dispenser_Pink.glb" "https://builder-items.decentraland.org/contents/bafybeiek4z4djosl57wiug2trbfs2ag5wx3vt25w2s2mfnxbhsnuaysc2m"
dl "Fliptop_Bin.glb" "https://builder-items.decentraland.org/contents/bafybeihyayae5ap5kzdiqeguaefab2glj4rmvtca2exepnwg3sz36uofmm"
dl "Hot_Dog.glb" "https://builder-items.decentraland.org/contents/bafybeicydbnfk44xlsehzf6qgkot3rd22ci43ptnjh3ioxzydtzulwcctq"
dl "Neon_Hanging_Sign.glb" "https://builder-items.decentraland.org/contents/bafybeic74cqeujhqtj6dqzvuf7prtfmb3s3o3gibybrrjdrwrdxq7c7cce"
dl "Neon_Oval_Sign.glb" "https://builder-items.decentraland.org/contents/bafybeiedgpnlxt37lpaogmjykv37su5ulan6c6u5eo2y4ouos4xwqvxhp4"
dl "Neon_Tube_Blue.glb" "https://builder-items.decentraland.org/contents/bafybeiebpkhgkyj4lztkpcecag5iwwiov2mmz7plbhytim5fn7pihsxuee"
dl "Neon_Tube_Red.glb" "https://builder-items.decentraland.org/contents/bafybeid2tuh272necappxypdu5rnlnr2izof2qruxxaptpkjz2bzoemcyu"
dl "Poster1.glb" "https://builder-items.decentraland.org/contents/bafkreih3rotpx3qebfkef47iih43cohwsink6ev24ljopufl4ojyhcfrzy"
dl "Poster3.glb" "https://builder-items.decentraland.org/contents/bafybeibwhijyf2drnwsaknzyscics6vz3ymbn2ybfxmrlsjnreglzp7t3e"
dl "Poster5.glb" "https://builder-items.decentraland.org/contents/bafkreicifbcxe7l5cugqgavcgibc4pajkjkafjydl7i3nin2la3wf4poqm"
dl "Sofa_Black.glb" "https://builder-items.decentraland.org/contents/bafybeihsavsdkdvzfykywnvw3gvtirwp46w6kclkernirykkgpct3lkb44"
dl "Soup_Bowl.glb" "https://builder-items.decentraland.org/contents/bafybeicovoe4ac3ffvk4zvqhroeytzxl6pf5gnth6t7ncvwlr2snzxtbpa"
dl "WineBottle_01.glb" "https://builder-items.decentraland.org/contents/bafkreifkbgccds5p4vqjxu7moydnqx2ottrs6a6v76g2via3td4sor2zey"

# === Western Pack ===
dl "Bench 3.glb" "https://builder-items.decentraland.org/contents/bafkreiauenog7bfq6m6cheeyvrpfckodsxymswtk455yfemywijtvy2vfq"
dl "Barrel 1.glb" "https://builder-items.decentraland.org/contents/bafkreibqai6bgwnktttcegiwjd7mfoca6dsqlqao5trtxe4f2mltlk2lza"
dl "Barrel 2.glb" "https://builder-items.decentraland.org/contents/bafkreife7hbfuwevey3zrjip6p2vjpeyh23byauazxahrwknwgfe5tp5aa"
dl "Books.glb" "https://builder-items.decentraland.org/contents/bafkreibrmhb7ib6ehbcupsb2ity5zc5ltosk2bgdzfveyz7lhepazkcs3q"
dl "Chandelier 1.glb" "https://builder-items.decentraland.org/contents/bafkreifseq4p2fj37lpgsk5vivvujp7sfmpyt3rbjivmp3hukzhahk2ooe"
dl "Chandelier 2.glb" "https://builder-items.decentraland.org/contents/bafkreia4yw66pdcvltcaygbfc34liqqmrlhzgq4i72q76b3ss2lk3e6sry"
dl "Door 5.glb" "https://builder-items.decentraland.org/contents/bafkreihhabsnccekmgijtvavee7vkg6kuevtbxwbqte5bvikhqp25mskui"
dl "Furnit Bar 1 2M.glb" "https://builder-items.decentraland.org/contents/bafkreihw5g672wpvopvntg4lxqsbmdnwrkunwjrikx4v2fu4osjkboj6ia"
dl "Furnit Bar 2 3M.glb" "https://builder-items.decentraland.org/contents/bafkreigmg7rdptjh7byvj5sl6x4ldfm5biwkwflmolqjltmw6jb73wjg5m"
dl "Furnit Bar 3 1M.glb" "https://builder-items.decentraland.org/contents/bafkreie6v6unsz74fv6267e4txq55qwswzj3zmbqanw4ihxuaqcufp4cgi"
dl "Furnit Bar 4 2M.glb" "https://builder-items.decentraland.org/contents/bafkreidg3jjaccgqetvcwfu2kae2hfzrwe5tutlyntmizrqrwijortvqzq"
dl "Lamp 1.glb" "https://builder-items.decentraland.org/contents/bafkreidmdtux4cn5cg76ol2bivhpcztblkabumdnnnqx5zl4tjo4w5hwmu"
dl "Light Wall.glb" "https://builder-items.decentraland.org/contents/bafkreibcq2kjql7fafookk7dra4kmjx2csfwjeo33qn3bpagnzvfh2xdpi"
dl "Light Wheel.glb" "https://builder-items.decentraland.org/contents/bafkreidslmt67pqwpytnj4emxuqodszmbln4yiewycjccxw6lsrofojmwm"
dl "Milk 1.glb" "https://builder-items.decentraland.org/contents/bafkreihkughug5pmmxlgptbhb5t5dr3a6snjgz2wzqolsujbl65tmjtfk4"
dl "Milk 2.glb" "https://builder-items.decentraland.org/contents/bafkreickhdqewooq3xt37kmhjjukgdldbkii4tmz2l4myc272akjx54rg4"
dl "Piano.glb" "https://builder-items.decentraland.org/contents/bafkreih3tdr3vxajljbd4lyhbonk2s5kybvrzwz3ndluy2fe4obvmuuvwy"
dl "Table 3.glb" "https://builder-items.decentraland.org/contents/bafkreiaywsjd3jt6tc6yra5ihxwm2nzfzlrxmducpgbml23vz3uc2r54s4"

# === Fantasy Pack ===
dl "Chandelier_02.glb" "https://builder-items.decentraland.org/contents/bafkreibgnxjyg24k3cj5zb62776fh637uf6yuhmgxqqw54vnkliodrtkty"

# === Genesis City Pack ===
dl "Carpet_02.glb" "https://builder-items.decentraland.org/contents/bafkreidrmfipfae4adqiuzah4ajqxerybzxwlr6hv6oqo47p4xpxlejcm4"
dl "Carpet_03.glb" "https://builder-items.decentraland.org/contents/bafkreieb7uba4pgej2pdr3nk6thm7vs4qddwknxt32c7hjxh56gf6s7vlq"

# === Western Desk ===
dl "Furnit 4 Desk.glb" "https://builder-items.decentraland.org/contents/bafkreifw6mbrllqs4zf5u6ofbq6w33gzfnnq733kvzpm6qm6rhegw6g5by"

# === Pirates Pack (bottles) ===
dl "Bottle_06.glb" "https://builder-items.decentraland.org/contents/bafkreieniz6hpuvsbwpi2ypsi2tpxounwxzi67kwrn7zudxd5qybs4v5j4"

echo ""
echo "Download complete: $(ls *.glb 2>/dev/null | wc -l) models"
