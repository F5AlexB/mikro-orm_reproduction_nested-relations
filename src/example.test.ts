import { Collection, Entity, ManyToOne, MikroORM, OneToMany, Opt, PrimaryKey, PrimaryKeyProp, Property, Ref, Unique } from '@mikro-orm/sqlite';

@Entity()
class StandaloneEntityOne {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  [PrimaryKeyProp]?: ['id']

  @Property()
  name!: string;

  @Unique()
  @Property()
  email!: string;
}

@Entity()
class StandaloneEntityTwo {
  @PrimaryKey({ type: 'string' })
  fieldId!: string;

  [PrimaryKeyProp]?: ['fieldId']

  @Property({ type: 'boolean' })
  someBooleanFlag = true;

  @Property({ type: 'string'})
  name!: string;

  @OneToMany({ entity: () => AnEntityInTheMiddle, mappedBy: (e) => e.standalone2 })
  listOfMiddleEntitites = new Collection<AnEntityInTheMiddle>(this);
}

@Entity()
class AnEntityInTheMiddle {
  @ManyToOne({ entity: () => StandaloneEntityOne, primary: true, ref: true })
  standalone1!: Ref<StandaloneEntityOne>;

  @ManyToOne({ entity: () => StandaloneEntityTwo, primary: true, ref: true })
  standalone2!: Ref<StandaloneEntityTwo>;

  [PrimaryKeyProp]?: ['standalone1', 'standalone2']

  @Property({ type: 'string', nullable: true })
  arbitraryData: Opt<string> | null = null;
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [StandaloneEntityOne, StandaloneEntityTwo, AnEntityInTheMiddle],
    //debug: true,
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test('query implosion 1', async () => {
  const standalone2Repo = orm.em.getRepository(StandaloneEntityTwo);

  await standalone2Repo.find({
    $and: [
      {
        someBooleanFlag: true,
      },
      {
        name: { $like: '%asdf%' }
      },
    ],
    listOfMiddleEntitites: {
      $none: {
        standalone1: {
          id: 1,
        },
        arbitraryData: { $ne: null },
      }
    }
  })
});

test('query implosion 2', async () => {
  const standalone2Repo = orm.em.getRepository(StandaloneEntityTwo);

  await standalone2Repo.find({
    $and: [
      {
        someBooleanFlag: true,
      },
      {
        name: { $ilike: '%%' }
      },
    ],
    $not: {
      listOfMiddleEntitites: {
        $some: {
          standalone1: {
            id: 1,
          },
          $not: {
            arbitraryData: null,
          }
        }
      }
    }
  })
});
