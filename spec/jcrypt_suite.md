##Test suite 'jcrypt'

###(describe) '#decrypt'
	 it -> 'should work'

###(describe) '#decryptFile'
	 it -> 'should return the cleartext file contents'

###(describe) '#decryptDataToFile'
	 it -> 'should be able to create a new file'
	 it -> 'should be able to write cleartext to an existing file'

###(describe) '#decryptToFile'
	 it -> 'should write to file'
	 it -> 'should write in-place'

###(describe) '#encrypt'
	 it -> 'should work'

###(describe) '#encryptFile'
	 it -> 'should stream the enciphered file contents'

###(describe) '#encryptDataToFile'
	 it -> 'should be able to create a new file'
	 it -> 'should be able to write enciphered text to an existing file'

###(describe) '#encryptToFile'
	 it -> 'should write to file'
	 it -> 'should write in-place'

###(describe) '#getDefaultWriteOptions'
	 it -> 'should work'

###(describe) '#setDefaultWriteOptions'
	 it -> 'should allow the write options to be changed'