{
  description = "ctxdrop - Pack your codebase into a single context file for AI agents to use";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "ctxdrop";
          version = "0.1.0";
          src = ./.;
          buildInputs = with pkgs; [ 
            bun
            node_24
          ];
          buildPhase = ''
            bun build src/cli.ts --outdir dist --target node
          '';
          installPhase = ''
            mkdir -p $out/bin
            cp -r dist $out/lib/node_modules/ctxdrop/
            ln -s $out/lib/node_modules/ctxdrop/dist/cli.js $out/bin/ctxdrop
            chmod +x $out/bin/ctxdrop
          '';
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [ bun ];
        };
      }
    );
}
