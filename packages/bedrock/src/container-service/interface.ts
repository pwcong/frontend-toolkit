import {
  IInstantiationService,
  refineServiceDecorator,
  ServiceCollection,
} from '@/di';

export interface IContainerService extends IInstantiationService {
  readonly _serviceBrand: undefined;

  createChild: (services: ServiceCollection) => IContainerService;

  dispose: () => void;
}

export const IContainerService = refineServiceDecorator<
  IInstantiationService,
  IContainerService
>(IInstantiationService);
