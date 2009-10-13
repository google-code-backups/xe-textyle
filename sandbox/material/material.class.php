<?php
    /**
     * @class  material
     * @author sol (sol@ngleader.com)
     * @brief  material 모듈의 high class
     **/


    class material extends ModuleObject {

		function material(){
		}

		/**
		 * @brief 설치시 추가 작업이 필요할시 구현
		 **/
		function moduleInstall() {
            $oModuleController = &getController('module');

			$oModuleController->insertTrigger('material.deleteMaterial', 'file', 'controller', 'triggerDeleteAttached', 'after');
			$oModuleController->insertTrigger('material.deleteMaterials', 'file', 'controller', 'triggerDeleteModuleFiles', 'after');
		}

		/**
		 * @brief 설치가 이상이 없는지 체크하는 method
		 **/
		function checkUpdate() {
            $oModuleModel = &getModel('module');

			if(!$oModuleModel->getTrigger('material.deleteMaterial', 'file', 'controller', 'triggerDeleteAttached', 'after')){
				return true;
			}

			if(!$oModuleModel->getTrigger('material.deleteMaterials', 'file', 'controller', 'triggerDeleteModuleFiles', 'after')){
				return true;
			}
	

			return false;
		}

		/**
		 * @brief 업데이트 실행
		 **/
		function moduleUpdate() {
			$oModuleModel = &getModel('module');
            $oModuleController = &getController('module');

			if(!$oModuleModel->getTrigger('material.deleteMaterial', 'file', 'controller', 'triggerDeleteAttached', 'after')){
				$oModuleController->insertTrigger('material.deleteMaterial', 'file', 'controller', 'triggerDeleteAttached', 'after');
			}

			if(!$oModuleModel->getTrigger('material.deleteMaterials', 'file', 'controller', 'triggerDeleteModuleFiles', 'after')){
				$oModuleController->insertTrigger('material.deleteMaterials', 'file', 'controller', 'triggerDeleteModuleFiles', 'after');
			}
	
			return new Object(0, 'success_updated');
		}

		/**
		 * @brief 캐시 파일 재생성
		 **/
		function recompileCache() {
		}
    }
?>
