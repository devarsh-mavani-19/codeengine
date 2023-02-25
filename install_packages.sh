languages=`ls ./packages`
echo "Installing packages...."
for language in $languages; do
	versions=`ls ./packages/$language`
	for version in "$versions"; do
		`bash -c 'cd ./packages/java/15/ && sh ./install.sh && echo pwd && sh ./environment'`
		echo "Installed $language $version"
	done
done
