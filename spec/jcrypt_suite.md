##Test suite 'jcrypt'

###(describe) '#decrypt'
	 it -> 'should work'

###(describe) '#decryptFile'
	 it -> 'should return the cleartext file contents'

###(describe) '#decryptDataToFile'
	 it -> 'should work'

###(describe) '#decryptToFile'
	 it -> 'should write to file'
	 it -> 'should write in-place'

###(describe) '#encrypt'
	 it -> 'should work'

###(describe) '#encryptFile'
	 it -> 'should stream the enciphered file contents'

###(describe) '#encryptDataToFile'
	 it -> 'should create a new file'
	 it -> 'should write enciphered text to existing file'

###(describe) '#encryptToFile'
	 it -> 'should write to file'
	 it -> 'should write in-place'