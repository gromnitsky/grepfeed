# requires: jq, imagemagick, wix, node, pandoc, curl

out := _out
w := $(out)/w
name := $(shell jq -r '.name' package.json)
ver := $(shell jq -r '.version' package.json)
prog := $(name)-$(ver)

all: $(out)/$(prog).msi

clean:
	rm -rf $(w) .wix

src := $(if $(findstring CYGWIN,$(shell uname)),`cygpath -wa $(w)`,$(w))

$(out)/$(prog).msi: msi/installer.wxs msi/$(wildcard *.wxl) .wix/.deps $(addprefix $(w)/, icon.ico grepfeed.xml node.exe WinSW-x64.exe package/package.json license.rtf)
	wix build $< -loc msi/en-us.wxl -ext WixToolset.Util.wixext -ext WixToolset.UI.wixext -arch x64 -out $@ -d SourceDir=$(src) -d Version=$(ver)

.wix/.deps:
	$(mkdir)
	wix extension add WixToolset.Util.wixext
	wix extension add WixToolset.UI.wixext
	touch $@

$(w)/node.exe:
	$(mkdir)
	cp `which node.exe` $@

$(w)/WinSW-x64.exe:
	$(mkdir)
	curl -Lf https://github.com/winsw/winsw/releases/download/v3.0.0-alpha.11/WinSW-x64.exe -o $@
	chmod +x $@

$(w)/%: msi/%
	$(mkdir)
	$(copy)

$(w)/license.rtf: LICENSE
	$(mkdir)
	pandoc -s $< -f markdown -o $@

$(w)/package/package.json:
	$(mkdir)
	npm pack
	tar -C $(w) -xf $(prog).tgz
	cd $(w)/package && npm i --no-audit --no-package-lock --omit=dev
	rm $(prog).tgz

$(w)/icon.ico: $(wildcard msi/*png)
	$(mkdir)
	convert $^ $@



mkdir = @mkdir -p $(dir $@)
copy = cp $< $@
.DELETE_ON_ERROR:
