let
  pkgs = import (fetchTarball {
    url = "https://artifactory.statnett.no/artifactory/github/NixOS/nixpkgs/archive/refs/tags/26.05.tar.gz";
    sha256 = "1zn1lsafn62sz6azx6j735fh4vwwghj8cc9x91g5sx2nrg23ap9k";
  }) {};

in
pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs
    pkgs.curl
    pkgs.jq
  ];

}