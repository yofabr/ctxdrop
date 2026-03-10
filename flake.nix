{
  description = "ctxdrop - Pack your codebase into a single context file";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ self.overlays.default ];
        };
      in
      {
        packages.default = pkgs.ctxdrop;

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            bun
          ];
        };
      }
    );

  overlays.default = final: prev: {
    ctxdrop = final.stdenv.mkDerivation {
      pname = "ctxdrop";
      version = "0.1.0";
      src = ./.;
      buildInputs = with final; [ bun ];
      buildPhase = ''
        bun build src/cli.ts --outdir dist --target node
      '';
      installPhase = ''
        mkdir -p $out/lib/node_modules/${final.ctxdrop.pname}
        cp -r dist $out/lib/node_modules/${final.ctxdrop.pname}/
        mkdir -p $out/bin
        ln -s $out/lib/node_modules/${final.ctxdrop.pname}/dist/cli.js $out/bin/ctxdrop
        chmod +x $out/bin/ctxdrop
      '';
    };
  };
}
