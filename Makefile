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
	$(CURL) -sSLf https://raw.githubusercontent.com/wakaba/ciconfig/master/ciconfig | RUN_GIT=1 REMOVE_UNUSED=1 perl

## ------ Setup ------

deps: git-submodules pmbp-install ddsd-pull build
deps-docker: pmbp-install build-local
deps-lserver: deps local/charrels

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
pmbp-install: pmbp-upgrade ./lserver
	perl local/bin/pmbp.pl $(PMBP_OPTIONS) --install \
            --create-perl-command-shortcut @perl \
            --create-perl-command-shortcut @prove

ddsd-booter:
#XXX	$(CURL) -sSLf https://raw.githubusercontent.com/geocol/ddsd/master/bin/booter | bash
	$(CURL) -sSLf https://raw.githubusercontent.com/geocol/ddsd/staging/bin/booter.staging | bash
ddsd-pull: ddsd-booter
	./ddsd pull

./lserver:
	echo '#!/bin/bash' > $@
	echo 'cd `dirname $$0`' >> $@
	echo 'echo http://localhost:6653' >> $@
	echo './perl bin/sarze-server.pl 6653' >> $@
	chmod u+x $@
## requires: make deps-lserver; cd ..; git clone https://github.com/manakai/data-chars; cd data-chars; make build-swdata

## ------ Build ------

build: build-local build-repo
build-local: local/data \
    local/data/jp-holidays.json local/data/ryukyu-holidays.json \
    local/data/jp-flagdays.json \
    local/data/calendar-era-defs.json \
    local/data/calendar-era-systems.json \
    local/data/calendar-era-transitions.json \
    local/data/days.json local/data/numbers-kanshi.json \
    local/data/char-names.json \
    local/data/countries.json \
    local/data/macroregions.json \
    local/data/jp-regions-full-flatten.json \
    local/data/sww-pages.json \
    local/data/calendar-era-defs-0.json \
    local/data/calendar-era-labels-0.json \
    local/data/calendar-era-relations-0.json \
    local/data/calendar-era-transitions-0.json \
    local/data/tags-0.json

build-repo: js/components.js js/kage.js js/opentype.js css/default.css
local/data:
	mkdir -p local/data

js/components.js: local/page-components.js local/time.js intermediate/md5.js \
    local/unit-number.js
	cat local/page-components.js local/time.js > $@
	cat local/unit-number.js >> $@
	cat intermediate/md5.js >> $@

local/kage-engine:
	git clone https://github.com/kamichikoichi/kage-engine $@
js/kage.js: js/kage-api.js
	$(MAKE) local/kage-engine/*.js local/kage-engine/COPYING js/kage-api.js
	echo '(function () {' > $@
	echo '/* Original: <https://github.com/kamichikoichi/kage-engine> */' >> $@
	cat local/kage-engine/2d.js >> $@
	cat local/kage-engine/buhin.js >> $@
	cat local/kage-engine/curve.js >> $@
	cat local/kage-engine/kage.js >> $@
	cat local/kage-engine/kagecd.js >> $@
	cat local/kage-engine/kagedf.js >> $@
	cat local/kage-engine/polygon.js >> $@
	cat local/kage-engine/polygons.js >> $@
	cat js/kage-api.js >> $@
	echo '}) () /*' >> $@
	cat local/kage-engine/COPYING >> $@
	echo '*/' >> $@

local/page-components.js: local/generated
	$(WGET) -O $@ https://raw.githubusercontent.com/wakaba/html-page-components/master/src/page-components.js
css/default.css: local/generated
	$(WGET) -O $@ https://raw.githubusercontent.com/wakaba/html-page-components/master/css/default.css
local/time.js: local/generated
	$(WGET) -O $@ https://raw.githubusercontent.com/wakaba/timejs/master/src/time.js
local/unit-number.js: local/generated
	$(WGET) -O $@ https://raw.githubusercontent.com/wakaba/html-unit-number/master/src/unit-number.js

local/opentype.js: local/generated
	$(WGET) -O $@ https://raw.githubusercontent.com/manakai/opentypejs/master/dist/opentype.js
js/opentype.js: local/opentype.js
	cp $< $@

intermediate/md5.js:
	$(WGET) -O $@ https://raw.githubusercontent.com/blueimp/JavaScript-MD5/master/js/md5.js

local/data/jp-holidays.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/manakai/data-locale/master/data/calendar/jp-holidays.json
local/data/ryukyu-holidays.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/manakai/data-locale/master/data/calendar/ryukyu-holidays.json
local/data/jp-flagdays.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/manakai/data-locale/master/data/calendar/jp-flagdays.json
local/data/calendar-era-defs.json: \
    local/data/calendar-era/files/calendar-era-defs.json
	cp $< $@
local/data/calendar-era-defs-0.json: local/data/calendar-era-defs.json \
    bin/split.pl
	$(PERL) bin/split.pl $< local/data/calendar-era-defs
local/data/calendar-era-transitions.json: \
    local/data/calendar-era/files/calendar-era-transitions.json
	cp $< $@
local/data/calendar-era-transitions-0.json: \
    local/data/calendar-era-transitions.json \
    bin/split.pl
	$(PERL) bin/split.pl $< local/data/calendar-era-transitions
local/data/calendar-era-relations-0.json: \
    local/data/calendar-era/files/calendar-era-relations.json \
    bin/split.pl
	$(PERL) bin/split.pl $< local/data/calendar-era-relations
local/data/calendar-era-labels-0.json: \
    local/data/calendar-era/files/calendar-era-labels.json \
    bin/split.pl
	$(PERL) bin/split.pl $< local/data/calendar-era-labels
local/data/calendar-era-systems.json: \
    local/data/calendar-era/files/calendar-era-systems.json
	cp $< $@

local/data/numbers-kanshi.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/manakai/data-locale/master/data/numbers/kanshi.json

local/data/tags-0.json: local/data/calendar-era/files/tags.json \
    bin/split.pl
	$(PERL) bin/split.pl $< local/data/tags

local/data/days-orig.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/geocol/data-days/master/data/days-ja.json
local/data/days.json: bin/generate-days.pl local/data/days-orig.json
	$(PERL) $< > $@

local/data/countries.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/geocol/data-countries/master/data/countries.json
local/data/macroregions.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/geocol/data-countries/master/data/macroregions.json
local/data/jp-regions-full-flatten.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/geocol/data-jp-areas/master/data/jp-regions-full-flatten.json

local/data/char-names.json:
	$(WGET) -O $@ https://raw.githubusercontent.com/manakai/data-chars/master/data/names.json

local/sww-pages-1.jsonl:
	$(WGET) -O $@ https://gist.githubusercontent.com/wakaba/d708f869625459c1c80068513ba0d083/raw/pages-1.jsonl
local/sww-pages-2.jsonl:
	$(WGET) -O $@ https://gist.githubusercontent.com/wakaba/d708f869625459c1c80068513ba0d083/raw/pages-2.jsonl
local/data/sww-pages.json: local/sww-pages-1.jsonl local/sww-pages-2.jsonl
	$(PERL) -MJSON::PS -MWeb::URL::Encoding -e 'while(<>){$$v=json_bytes2perl$$_;$$d->{$$v->[1]}=(percent_encode_c$$v->[3]->[0]).q{$$}.$$v->[2]};print perl2json_bytes$$d' local/sww-pages-1.jsonl local/sww-pages-2.jsonl > $@

## For lserver
local/charrels:
	cd local && ln -s ../../data-chars/local/generated/charrels/

local/generated:
	touch $@

## ------ Tests ------

PROVE = ./prove

test: test-deps test-main

test-deps: deps

test-main:
	#$(PROVE) t/*.t

## License: Public Domain.
