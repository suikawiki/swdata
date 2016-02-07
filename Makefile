all: build

WGET = wget
CURL = curl
GIT = git
PERL = ./perl

updatenightly: local/bin/pmbp.pl
	$(CURL) -s -S -L https://gist.githubusercontent.com/wakaba/34a71d3137a52abb562d/raw/gistfile1.txt | sh
	$(GIT) add modules
	perl local/bin/pmbp.pl --update
	$(GIT) add config

## ------ Setup ------

deps: git-submodules pmbp-install build
deps-docker: pmbp-install build

git-submodules:
	$(GIT) submodule update --init

PMBP_OPTIONS=

local/bin/pmbp.pl:
	mkdir -p local/bin
	$(CURL) -s -S -L https://raw.githubusercontent.com/wakaba/perl-setupenv/master/bin/pmbp.pl > $@
pmbp-upgrade: local/bin/pmbp.pl
	perl local/bin/pmbp.pl $(PMBP_OPTIONS) --update-pmbp-pl
pmbp-update: git-submodules pmbp-upgrade
	perl local/bin/pmbp.pl $(PMBP_OPTIONS) --update
pmbp-install: pmbp-upgrade
	perl local/bin/pmbp.pl $(PMBP_OPTIONS) --install \
            --create-perl-command-shortcut @perl \
            --create-perl-command-shortcut @prove \
            --create-perl-command-shortcut @plackup=perl\ modules/twiggy-packed/script/plackup

## ------ Build ------

build: local/data \
    local/data/jp-holidays.json local/data/ryukyu-holidays.json \
    local/data/jp-flagdays.json \
    local/data/calendar-era-defs.json \
    local/data/calendar-era-systems.json \
    local/data/days.json
local/data:
	mkdir -p local/data

local/data/jp-holidays.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/manakai/data-locale/master/data/calendar/jp-holidays.json
local/data/ryukyu-holidays.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/manakai/data-locale/master/data/calendar/ryukyu-holidays.json
local/data/jp-flagdays.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/manakai/data-locale/master/data/calendar/jp-flagdays.json
local/data/calendar-era-defs.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/manakai/data-locale/master/data/calendar/era-defs.json
local/data/calendar-era-systems.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/manakai/data-locale/master/data/calendar/era-systems.json

local/data/days-orig.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/geocol/data-days/master/data/days-ja.json
local/data/days.json: bin/generate-days.pl local/data/days-orig.json
	$(PERL) $< > $@

## ------ Tests ------

PROVE = ./prove

test: test-deps test-main

test-deps: deps

test-main:
	#$(PROVE) t/*.t

## License: Public Domain.
